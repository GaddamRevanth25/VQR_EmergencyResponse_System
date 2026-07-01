# VQR Emergency Response

A modern emergency vehicle identification and notification system utilizing QR codes and ML-based scanning.

## Monorepo Structure

- **`apps/web`**: React + Vite admin dashboard / scan interface.
- **`apps/mobile`**: Expo React Native mobile app for emergency responders.
- **`packages/shared`**: Shared TypeScript types, schemas (Zod), and API client.
- **`backend`**: FastAPI service handling core endpoints and ML vehicle inference.

## Quick Start

### Prerequisites
- Node.js (v24+)
- Python (v3.10+)

### Setup
Install all workspace dependencies:
```bash
npm install
```

### Running the Project

Run all frontend services in development mode via Turbo:
```bash
npm run dev
```

Run FastAPI Backend:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
