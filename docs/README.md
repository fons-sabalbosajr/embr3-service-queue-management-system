# EMBR3 — Service Queue Management System (SQMS)

A full-stack web application for managing service queues in an office or service-center environment. It provides a real-time queue dashboard for clients, a serving desk for queue officers, a secretariat transaction intake panel, and a full administrative back-office with role-based access control.

---

## Table of Contents

- [Features](#features)
- [Roles & Access](#roles--access)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start (Local Development)](#quick-start-local-development)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)

---

## Features

| Module | Description |
|---|---|
| **Queue Dashboard** | Public-facing display showing currently called queue numbers and serving windows |
| **Queue Officer Serving Desk** | Interface for officers to call the next number, skip, or complete a transaction |
| **My Queue Portal** | Officer's personal portal for tracking their own queue activity |
| **Secretariat Start Transaction** | Intake form for secretariat staff to register a new transaction/client |
| **Settings — Assigned Officers** | Assign or reassign officers to service windows |
| **Settings — Transaction Monitoring** | Configure transaction types and monitoring rules |
| **Settings — Dashboard Display** | Customize the public queue display appearance |
| **Settings — Time & Queue Management** | Define queue operating hours and queue numbering rules |
| **Developer — User Account Management** | Full CRUD for admin user accounts with role assignment |
| **Developer — Database Status & Connections** | Live database connectivity diagnostics |
| **Developer — App Logs** | View system and application event logs |
| **Authentication** | JWT-based login, signup, forgot/reset password via email |

---

## Roles & Access

| Role | Access Modules |
|---|---|
| **Super Admin / Developer** | All modules |
| **Admin** | Dashboard, Settings, Queue Dashboard |
| **Queue Officer** | Dashboard, Serving Desk, Queue Portal, Queue Dashboard |
| **Secretariat** | Dashboard, Start Transaction, Queue Dashboard |

---

## Tech Stack

**Frontend**
- React 19 (Vite)
- Ant Design 6
- React Router v7
- Axios
- crypto-js (secure local storage)

**Backend**
- Node.js / Express 5
- MongoDB + Mongoose
- JSON Web Tokens (jsonwebtoken)
- bcryptjs
- Nodemailer (transactional email)

---

## Project Structure

```
embr3-service-queue-management-system/
├── docs/                    # Project documentation
├── front-end/               # React/Vite SPA
│   ├── public/
│   └── src/
│       ├── api/             # Axios client
│       ├── components/      # Shared components (ProtectedRoute, etc.)
│       ├── context/         # React context (AuthContext)
│       ├── pages/
│       │   ├── admin/       # All admin / back-office pages
│       │   └── queue/       # Public queue display dashboard
│       └── utils/           # Helpers (secureStorage, exportData)
└── server/                  # Express API
    ├── config/              # Database connection
    ├── controllers/         # Route handler logic
    ├── middleware/          # Auth middleware (JWT verification)
    ├── models/              # Mongoose schemas
    ├── routes/              # Express routers
    └── utils/               # Email templates, logging, roles
```

---

## Quick Start (Local Development)

### Prerequisites
- Node.js >= 18
- MongoDB (local or Atlas URI)

### 1. Clone & install

```bash
git clone <repo-url>
cd embr3-service-queue-management-system

# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../front-end && npm install
```

### 2. Configure environment

Create `server/.env` (see [Environment Variables](#environment-variables)).

### 3. Run development servers

```bash
# Terminal 1 — backend
cd server
npm run dev

# Terminal 2 — frontend
cd front-end
npm run dev
```

The frontend dev server proxies `/api/*` requests to `http://localhost:5000` by default.

---

## Environment Variables

Create a `.env` file inside the `server/` directory:

```env
# MongoDB connection string
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>

# Express port
PORT=5000

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRE=7d

# Email (Nodemailer)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=no-reply@example.com
EMAIL_PASS=your_email_password

# Frontend base URL (used in reset-password email links)
CLIENT_URL=http://localhost:5173
```

---

## Available Scripts

### Backend (`server/`)

| Command | Description |
|---|---|
| `npm run dev` | Start with nodemon (auto-reload) |
| `npm start` | Start with node (production) |

### Frontend (`front-end/`)

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production (`dist/`) |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
