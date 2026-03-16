# Workflow Automation System

A production-ready **Workflow Automation System** built with the MERN stack (MongoDB, Express, React, Node.js). Design workflows, define conditional rules, execute with dynamic decision-making, and manage approvals.

## Features

- **JWT Authentication** with Role-Based Access Control (admin, manager, employee)
- **Workflow Designer** — create workflows with steps (task, approval, notification)
- **Rules Engine** — conditional branching with operators (`==`, `!=`, `>`, `<`, `>=`, `<=`, `&&`, `||`) and string functions (`contains`, `startsWith`, `endsWith`)
- **Execution Engine** — dynamic step execution with rule evaluation and loop protection
- **Task Approvals** — approval steps create tasks assigned to users by role
- **Execution Logging** — full audit trail of every step, rule evaluation, and decision
- **Workflow Versioning** — version increments on every update

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB running locally on port 27017

### Backend Setup

```bash
cd backend
npm install
npm start
```

Server starts on `http://localhost:5000`. A default admin account is auto-created:
- **Email:** admin@example.com
- **Password:** admin123

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

### Seed Sample Users (Optional)

```bash
cd backend
npm run seed
```

Creates:
| Email | Password | Role |
|---|---|---|
| admin@example.com | admin123 | admin |
| manager@example.com | manager123 | manager |
| employee@example.com | employee123 | employee |

## Environment Variables

Create `backend/.env`:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/workflow-system
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/create-user` | Create user (admin) |
| GET | `/api/workflows` | List workflows |
| POST | `/api/workflows` | Create workflow |
| GET | `/api/workflows/:id` | Get workflow |
| PUT | `/api/workflows/:id` | Update workflow |
| DELETE | `/api/workflows/:id` | Delete workflow |
| POST | `/api/workflows/:wid/steps` | Create step |
| GET | `/api/workflows/:wid/steps` | List steps |
| PUT | `/api/steps/:id` | Update step |
| DELETE | `/api/steps/:id` | Delete step |
| POST | `/api/steps/:sid/rules` | Create rule |
| GET | `/api/steps/:sid/rules` | List rules |
| PUT | `/api/rules/:id` | Update rule |
| DELETE | `/api/rules/:id` | Delete rule |
| POST | `/api/workflows/:wid/execute` | Execute workflow |
| GET | `/api/executions` | List executions |
| GET | `/api/executions/:id` | Get execution detail |
| POST | `/api/executions/:id/cancel` | Cancel execution |
| POST | `/api/executions/:id/retry` | Retry execution |
| GET | `/api/tasks/my` | My assigned tasks |
| POST | `/api/tasks/:id/approve` | Approve task |
| POST | `/api/tasks/:id/reject` | Reject task |

## Project Structure

```
workflow-system/
├── backend/
│   ├── config/         # Database configuration
│   ├── models/         # Mongoose schemas
│   ├── controllers/    # Route handlers
│   ├── routes/         # Express routes
│   ├── middleware/      # Auth, RBAC, error handling
│   ├── services/       # Rules Engine, Workflow Engine
│   ├── utils/          # Seed scripts
│   └── server.js       # Entry point
├── frontend/
│   └── src/
│       ├── components/ # Navbar
│       ├── pages/      # All app pages
│       ├── services/   # API client
│       ├── context/    # Auth context
│       └── App.jsx     # Router setup
└── README.md
```
