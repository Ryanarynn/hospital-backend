const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph } = require('docx');

// Middleware otentikasi sederhana
const authenticate = (req, res, next) => {
    const userId = req.headers['user-id'];
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

// Bed Management
router.get('/beds', (req, res) => {
    db.all(`
        SELECT b.id, b.bed_number, b.status, b.last_updated, r.name AS room_name
        FROM Beds b
        JOIN Rooms r ON b.room_id = r.id
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.put('/beds/:id', authenticate, (req, res) => {
    const { status } = req.body;
    const userId = req.headers['user-id'];
    if (!['kosong', 'terisi', 'dibersihkan', 'dipesan'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    db.run(`
        UPDATE Beds
        SET status = ?, last_updated = CURRENT_TIMESTAMP
        WHERE id = ?
    `, [status, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Bed not found' });
        db.run(`
            INSERT INTO Audit_Log (user_id, action, entity_id, timestamp, details)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)
        `, [userId, 'update bed status', req.params.id, `Status changed to ${status}`], (err) => {
            if (err) console.error(err);
        });
        res.json({ message: 'Bed status updated' });
    });
});

// Mutasi Pasien
router.get('/mutations', (req, res) => {
    db.all(`
        SELECT m.id, p.name AS patient_name, m.mutation_date, m.reason,
               b1.bed_number AS from_bed, r1.name AS from_room,
               b2.bed_number AS to_bed, r2.name AS to_room
        FROM Mutations m
        JOIN Patients p ON m.patient_id = p.id
        LEFT JOIN Beds b1 ON m.from_bed_id = b1.id
        LEFT JOIN Beds b2 ON m.to_bed_id = b2.id
        LEFT JOIN Rooms r1 ON b1.room_id = r1.id
        LEFT JOIN Rooms r2 ON b2.room_id = r2.id
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.post('/mutations', authenticate, (req, res) => {
    const { patient_id, from_bed_id, to_bed_id, reason } = req.body;
    const userId = req.headers['user-id'];
    if (!patient_id || !to_bed_id) {
        return res.status(400).json({ error: 'patient_id and to_bed_id required' });
    }
    db.run(`
        INSERT INTO Mutations (patient_id, from_bed_id, to_bed_id, mutation_date, reason)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)
    `, [patient_id, from_bed_id, to_bed_id, reason], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        db.run(`
            UPDATE Patients
            SET current_bed_id = ?
            WHERE id = ?
        `, [to_bed_id, patient_id], (err) => {
            if (err) console.error(err);
        });
        db.run(`
            INSERT INTO Audit_Log (user_id, action, entity_id, timestamp, details)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)
        `, [userId, 'create mutation', this.lastID, `Mutation for patient ${patient_id}`], (err) => {
            if (err) console.error(err);
        });
        res.json({ message: 'Mutation created', mutation_id: this.lastID });
    });
});

// Otentikasi
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM Users WHERE username = ?', [username], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
        res.json({ user_id: user.id, role: user.role, name: user.name });
    });
});

// Laporan
router.get('/reports/bed-availability/excel', authenticate, async (req, res) => {
    const userId = req.headers['user-id'];
    db.all(`
        SELECT r.name AS room_name, b.status, COUNT(*) AS count
        FROM Beds b
        JOIN Rooms r ON b.room_id = r.id
        GROUP BY r.id, b.status
    `, [], async (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Bed Availability');
        sheet.columns = [
            { header: 'Room', key: 'room_name', width: 20 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Count', key: 'count', width: 10 }
        ];
        sheet.addRows(rows);
        const buffer = await workbook.xlsx.writeBuffer();
        db.run(`
            INSERT INTO Audit_Log (user_id, action, entity_id, timestamp, details)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)
        `, [userId, 'generate report', null, 'Bed availability report (Excel)'], (err) => {
            if (err) console.error(err);
        });
        res.setHeader('Content-Disposition', 'attachment; filename=bed_availability.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    });
});

router.get('/reports/bed-availability/pdf', authenticate, (req, res) => {
    const userId = req.headers['user-id'];
    db.all(`
        SELECT r.name AS room_name, b.status, COUNT(*) AS count
        FROM Beds b
        JOIN Rooms r ON b.room_id = r.id
        GROUP BY r.id, b.status
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const doc = new PDFDocument();
        res.setHeader('Content-Disposition', 'attachment; filename=bed_availability.pdf');
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);
        doc.fontSize(16).text('Bed Availability Report', { align: 'center' });
        doc.moveDown();
        rows.forEach(row => {
            doc.fontSize(12).text(`${row.room_name}: ${row.status} - ${row.count}`);
        });
        doc.end();
        db.run(`
            INSERT INTO Audit_Log (user_id, action, entity_id, timestamp, details)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)
        `, [userId, 'generate report', null, 'Bed availability report (PDF)'], (err) => {
            if (err) console.error(err);
        });
    });
});

router.get('/reports/bed-availability/word', authenticate, async (req, res) => {
    const userId = req.headers['user-id'];
    db.all(`
        SELECT r.name AS room_name, b.status, COUNT(*) AS count
        FROM Beds b
        JOIN Rooms r ON b.room_id = r.id
        GROUP BY r.id, b.status
    `, [], async (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const doc = new Document({
            sections: [{
                children: [
                    new Paragraph({ text: 'Bed Availability Report', heading: 'Heading1' }),
                    ...rows.map(row => new Paragraph(`${row.room_name}: ${row.status} - ${row.count}`))
                ]
            }]
        });
        const buffer = await Packer.toBuffer(doc);
        db.run(`
            INSERT INTO Audit_Log (user_id, action, entity_id, timestamp, details)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)
        `, [userId, 'generate report', null, 'Bed availability report (Word)'], (err) => {
            if (err) console.error(err);
        });
        res.setHeader('Content-Disposition', 'attachment; filename=bed_availability.docx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.send(buffer);
    });
});

module.exports = router;