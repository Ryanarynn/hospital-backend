# Hospital Backend API Documentation

Base URL: http://localhost:5000/api

## Authentication
- **POST /login**
  - Body: `{ "username": "string", "password": "string" }`
  - Response: `{ user_id: number, role: string, name: string }`
  - Example: `{ "username": "admin1", "password": "password123" }`

## Bed Management
- **GET /beds**
  - Returns: List of beds with room names
  - Response: `[{ id: number, bed_number: string, status: string, last_updated: string, room_name: string }, ...]`
- **PUT /beds/:id**
  - Headers: `user-id: number`
  - Body: `{ "status": "kosong | terisi | dibersihkan | dipesan" }`
  - Response: `{ message: string }`

## Mutations
- **GET /mutations**
  - Returns: List of mutations with patient and room details
  - Response: `[{ id: number, patient_name: string, mutation_date: string, reason: string, from_bed: string, from_room: string, to_bed: string, to_room: string }, ...]`
- **POST /mutations**
  - Headers: `user-id: number`
  - Body: `{ patient_id: number, from_bed_id: number, to_bed_id: number, reason: string }`
  - Response: `{ message: string, mutation_id: number }`

## Reports
- **GET /reports/bed-availability/excel**
  - Headers: `user-id: number`
  - Returns: Excel file with bed availability
- **GET /reports/bed-availability/pdf**
  - Headers: `user-id: number`
  - Returns: PDF file with bed availability
- **GET /reports/bed-availability/word**
  - Headers: `user-id: number`
  - Returns: Word file with bed availability