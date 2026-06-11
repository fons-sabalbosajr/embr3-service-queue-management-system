# EMBR3 SQMS — Application Architecture

## Overview

EMBR3 SQMS follows a classic **two-tier client-server architecture**: a React single-page application (SPA) communicates exclusively through a RESTful JSON API served by an Express backend. Persistence is handled by a MongoDB database (accessed via Mongoose ODM).

---

## High-Level Architecture

```
┌───────────────────────────────────────────────────────┐
│                       Clients                         │
│                                                       │
│  ┌─────────────────┐        ┌──────────────────────┐  │
│  │  Admin / Staff  │        │  Public Queue Screen │  │
│  │  (Browser SPA)  │        │  (Browser SPA)       │  │
│  └────────┬────────┘        └──────────┬───────────┘  │
└───────────┼──────────────────────────────────────────┘
            │  HTTPS / REST (JSON)
            ▼
┌───────────────────────────────────────────────────────┐
│              Express REST API  (Node.js)               │
│                                                       │
│  authRoutes          → authController                 │
│  adminManagementRoutes → adminManagementController    │
│  queueOfficerRoutes  → queueOfficerController         │
│  queueDisplayRoutes  → queueDisplayController         │
│  transactionMonitoringRoutes → transactionMonitoring… │
│  appLogRoutes        → appLogController               │
│  diagnosticsRoutes   → diagnosticsController          │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │  authMiddleware (JWT verification)              │  │
│  └─────────────────────────────────────────────────┘  │
└───────────────────────────┬───────────────────────────┘
                            │  Mongoose
                            ▼
               ┌────────────────────────┐
               │        MongoDB         │
               │                        │
               │  admins                │
               │  queueofficers         │
               │  counters              │
               │  transactionmonitors   │
               │  queuedisplayconfigs   │
               │  applogs               │
               │  backupsnapshots       │
               └────────────────────────┘
```

---

## Frontend Architecture

```
front-end/src/
├── main.jsx              Entry point — BrowserRouter + AuthProvider
├── App.jsx               Route tree (lazy-loaded pages)
├── theme.js              Ant Design global theme tokens
├── api/
│   └── client.js         Axios instance — base URL, auth header interceptor
├── context/
│   └── AuthContext.jsx   Global auth state (user, token, login/logout)
├── components/
│   └── ProtectedRoute.jsx  Redirects unauthenticated users to /admin
├── pages/
│   ├── admin/
│   │   ├── AuthLayout.jsx            Shared auth page wrapper
│   │   ├── Login.jsx
│   │   ├── Signup.jsx
│   │   ├── ForgotPassword.jsx
│   │   ├── ResetPassword.jsx
│   │   ├── AdminShell.jsx            Main app shell (sidebar + topbar)
│   │   ├── Home.jsx                  Dashboard / landing
│   │   ├── QueueOfficerServingDesk.jsx
│   │   ├── MyQueuePortal.jsx
│   │   ├── SecretariatStartTransaction.jsx
│   │   ├── SettingsAssignedOfficers.jsx
│   │   ├── SettingsTransactionMonitoring.jsx
│   │   ├── SettingsDashboardDisplay.jsx
│   │   ├── SettingsTimeQueueManagement.jsx
│   │   ├── DeveloperUserAccountManagement.jsx
│   │   ├── DeveloperDatabaseStatusConnections.jsx
│   │   ├── DeveloperAppLogs.jsx
│   │   └── DeveloperDisplayConfig.jsx
│   └── queue/
│       └── QueueDashboard.jsx        Public queue number display
└── utils/
    ├── secureStorage.js  AES-encrypted localStorage wrapper (crypto-js)
    └── exportData.js     CSV/JSON data export helpers
```

### Key Frontend Patterns

- **Lazy loading** — Every page is loaded via `React.lazy` + `Suspense` to minimize initial bundle size.
- **Protected routes** — `ProtectedRoute` checks `AuthContext` for a valid token before rendering any authenticated page.
- **Secure storage** — Sensitive values (token, user object) are AES-encrypted before being written to `localStorage`.
- **Centralized API client** — A single Axios instance in `api/client.js` attaches the JWT `Authorization` header automatically.
- **Role-based UI** — Sidebar navigation items and route guards are driven by the `accessModules` array on the authenticated user object.

---

## Backend Architecture

```
server/
├── server.js          App bootstrap — registers middleware and routes
├── config/
│   └── db.js          MongoDB connection via Mongoose
├── middleware/
│   └── authMiddleware.js  Verifies JWT; attaches decoded user to req.user
├── models/            Mongoose schemas & models
│   ├── Admin.js            User accounts + password reset token logic
│   ├── QueueOfficer.js     Officer–window assignment records
│   ├── Counter.js          Queue number counters per service type
│   ├── TransactionMonitoring.js
│   ├── QueueDisplayConfig.js
│   ├── AppLog.js
│   └── BackupSnapshot.js
├── controllers/       Business logic (called by routes)
├── routes/            Express Router definitions
└── utils/
    ├── roles.js        Role normalization + accessModules resolution
    ├── logEvent.js     Helper to write AppLog documents
    ├── emailTemplates.js  HTML email builders
    └── sendEmail.js    Nodemailer transport wrapper
```

### Key Backend Patterns

- **Separation of concerns** — Controllers contain all business logic; routes are thin and only wire HTTP verbs to controller methods.
- **JWT authentication** — `authMiddleware` is applied per-route (not globally), allowing public endpoints (health check, queue display) to remain unprotected.
- **Role & access control** — `roles.js` centralises which `accessModules` each role receives; access checks are enforced in controllers.
- **Password security** — Passwords hashed with bcryptjs; reset tokens are SHA-256 hashed before storage so the raw token never persists in the database.
- **Event logging** — Every significant system action calls `logEvent()`, which writes an `AppLog` document for the developer audit trail.

---

## Data Models

| Model | Purpose |
|---|---|
| `Admin` | User accounts (all roles). Stores name, email, hashed password, role, status, accessModules, and reset-token fields. |
| `QueueOfficer` | Links a user to a service window; tracks availability and current queue state. |
| `Counter` | Maintains the current queue number per service category. |
| `TransactionMonitoring` | Configuration and records for monitoring active transactions. |
| `QueueDisplayConfig` | Display settings (colors, labels, layout) for the public queue board. |
| `AppLog` | Audit/event log entries written by backend utilities. |
| `BackupSnapshot` | Metadata for database backup snapshots. |

---

## Authentication & Authorization Flow

```
Client                    API
  │                        │
  │── POST /api/auth/login ─▶
  │                        │  1. Find Admin by email
  │                        │  2. Compare bcrypt hash
  │                        │  3. Sign JWT (user id + role)
  │◀── { token, user } ────│
  │                        │
  │── GET /api/... ────────▶  Authorization: Bearer <token>
  │                        │  authMiddleware verifies + decodes JWT
  │                        │  Controller checks accessModules
  │◀── 200 / 403 ──────────│
```

---

## API Endpoint Summary

| Prefix | Module |
|---|---|
| `/api/auth` | Login, signup, forgot/reset password |
| `/api/admin-users` | User account CRUD |
| `/api/queue-officers` | Officer window assignment & queue actions |
| `/api/queue-display` | Queue display data + configuration |
| `/api/transaction-monitoring` | Transaction configuration & records |
| `/api/app-logs` | Read application event logs |
| `/api/diagnostics` | Database connectivity status |
| `/api/health` | Health-check endpoint (unauthenticated) |
