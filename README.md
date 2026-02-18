# Secure Task Management System

A production-grade, secure task management application built inside an **NX monorepo**, with a NestJS backend and Angular frontend, JWT authentication, and role-based access control (RBAC).

---

## Table of Contents

- [Setup Instructions](#setup-instructions)
- [Environment Configuration](#environment-configuration)
- [NX Architecture](#nx-architecture)
- [Folder Structure](#folder-structure)
- [ERD & Data Model](#erd--data-model)
- [RBAC Explanation](#rbac-explanation)
- [JWT Flow](#jwt-flow)
- [API Documentation](#api-documentation)
- [Testing Strategy](#testing-strategy)
- [Tradeoffs & Limitations](#tradeoffs--limitations)
- [Future Improvements](#future-improvements)
- [Scaling Considerations](#scaling-considerations)
- [Security Hardening Plan](#security-hardening-plan)

---

## Setup Instructions

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+

### Install & Run

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Copy environment file and edit
cp .env.example .env

# 3. Start the API (creates SQLite DB and seeds default user on first run)
npm run start:api

# 4. In another terminal, start the dashboard
npm run start:dashboard
```

- **API**: http://localhost:3333  
- **Dashboard**: http://localhost:4200  

### Default Login

On first start, the API seeds a default user:

- **Email**: `admin@example.com`  
- **Password**: `Admin123!`  

Override via `.env`: `SEED_USER_EMAIL`, `SEED_USER_PASSWORD`.

### Build for Production

```bash
npm run build
# Outputs: dist/apps/api, dist/apps/dashboard
```

### Run Tests

```bash
npm run test          # All projects
npm run test:api      # Backend only
npm run test:dashboard # Frontend only
```

### Troubleshooting: Dashboard "The system cannot find the file specified" (Windows)

If `npm run start:dashboard` fails with that error after the build succeeds:

1. **Get the exact missing path** (run from project root):
   ```bash
   npx nx serve dashboard --verbose
   ```
   Check the stack trace for the file path that is missing.

2. **Clear Nx cache** (close all terminals/IDE first if you get "EBUSY"):
   - Delete the `.nx` folder in the project root, or run `npx nx reset` from a fresh terminal.

3. **Workaround: build and serve static output**
   - Terminal 1: `npm run start:api`
   - Terminal 2: `npx nx build dashboard` then `npx http-server dist/apps/dashboard -p 4200 -c-1`
   - Open http://localhost:4200. The app will call the API at `/api`; use a proxy (e.g. Fiddler, or run the dashboard behind a reverse proxy that forwards `/api` to `http://localhost:3333`) or configure the app to use `http://localhost:3333` as the API base.

---

## Environment Configuration

Use `.env` in the repo root (never commit it). See `.env.example` for all keys.

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | `3333` |
| `NODE_ENV` | Environment | `development` |
| `JWT_SECRET` | Secret for signing JWTs | **Must set in production** |
| `JWT_EXPIRES` | Token expiry | `7d` |
| `DB_TYPE` | `sqlite` or `postgres` | `sqlite` |
| `DB_DATABASE` | DB name or path (SQLite path) | `data/tasks.sqlite` |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD` | PostgreSQL only | - |
| `SEED_USER_EMAIL` | First-run default user email | `admin@example.com` |
| `SEED_USER_PASSWORD` | First-run default password | `Admin123!` |

---

## NX Architecture

- **Single repo**: Backend (api), frontend (dashboard), and shared libs (data, auth).
- **Dependency graph**: `dashboard` and `api` depend on `data`; `api` also depends on `auth`; `auth` depends on `data`.
- **Build**: `nx build api`, `nx build dashboard`; shared code is compiled with each app.
- **Path aliases**: `@secure-task-mgmt/data`, `@secure-task-mgmt/auth` in `tsconfig.base.json`.

---

## Folder Structure

```
apps/
  api/                 # NestJS backend
    src/
      app/
      auth/            # Login, JWT strategy, guards
      tasks/           # Task CRUD, scoped by org
      audit/           # Audit log read
      entities/        # TypeORM entities
  dashboard/           # Angular SPA
    src/
      app/
        core/          # Auth, API, guards, interceptors, toast
        features/      # auth (login), dashboard (tasks), audit

libs/
  data/                # Shared DTOs, enums, interfaces (Role, TaskDto, JwtPayload, etc.)
  auth/                # @Roles() decorator, RolesGuard, hasMinimumRole
```

---

## ERD & Data Model

- **Organization**: Id, name, optional parentId (2-level hierarchy).
- **User**: Id, email, passwordHash, role (owner | admin | viewer), organizationId → Organization.
- **Task**: Id, title, description, status, category, orderIndex, organizationId, createdById, timestamps. Scoped by organization.
- **AuditLog**: Id, action, entityType, entityId, userId, organizationId, metadata (JSON), createdAt.

**Relations**: Organization has many Users and Tasks. User has many Tasks (createdBy). All queries filter by `organizationId` so tenants are isolated.

---

## RBAC Explanation

- **Roles**: `Owner` > `Admin` > `Viewer` (hierarchy in `libs/data`: `ROLE_HIERARCHY`).
- **Owner**: Full access; can manage org and members (conceptually; member CRUD not implemented in this scope).
- **Admin**: Create, update, delete tasks in the org; view audit log.
- **Viewer**: Read-only tasks; no audit log.

**Enforcement**:

- **Backend**: `@UseGuards(AuthGuard('jwt'), RolesGuard)`, `@Roles(Role.Viewer, Role.Admin, Role.Owner)` (or stricter). `RolesGuard` uses `hasMinimumRole(user.role, requiredRole)` so higher roles pass.
- **Frontend**: `auth.canEdit()`, `auth.canViewAudit()` hide/disable create/edit/delete and audit link for Viewers.

---

## JWT Flow

1. **Login**: `POST /auth/login` with email/password → AuthService validates credentials (bcrypt), then issues JWT with payload `{ sub, email, organizationId, role }`.
2. **Subsequent requests**: Frontend stores token (e.g. localStorage) and sends `Authorization: Bearer <token>` via HTTP interceptor.
3. **Backend**: `JwtStrategy` validates token and attaches `user` (id, email, organizationId, role) to the request. All protected routes use `AuthGuard('jwt')` and optionally `RolesGuard` + `@Roles()`.

---

## API Documentation

Base URL: `http://localhost:3333` (or via proxy from dashboard at `/api`).

### POST /auth/login

**Request:**

```json
{
  "email": "admin@example.com",
  "password": "Admin123!"
}
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "role": "owner",
    "organizationId": "uuid"
  }
}
```

### GET /tasks

**Headers:** `Authorization: Bearer <token>`

**Response:** Array of tasks (scoped to user’s organization).

### POST /tasks

**Headers:** `Authorization: Bearer <token>`  
**Body:** `{ "title": "string", "description?", "status?", "category?", "orderIndex?" }`  
**Roles:** Admin, Owner.

### PUT /tasks/:id

**Headers:** `Authorization: Bearer <token>`  
**Body:** Same as POST (partial update).  
**Roles:** Admin, Owner.

### DELETE /tasks/:id

**Headers:** `Authorization: Bearer <token>`  
**Roles:** Admin, Owner.

### GET /audit-log

**Headers:** `Authorization: Bearer <token>`  
**Query:** `page`, `limit`, `entityType`, `action` (optional).  
**Roles:** Owner, Admin.

**Response:** `{ "data": AuditEntry[], "total": number }`

---

## Testing Strategy

- **Backend (Jest)**: Unit tests for AuthService (login, invalid credentials), TasksService (create/find/update/delete, RBAC, org scoping), RolesGuard (role checks). Run with `npm run test:api`.
- **Frontend (Jest + Jest preset Angular)**: Component tests for login form and dashboard; service/guard tests as needed. Run with `npm run test:dashboard`.
- **E2E**: Not included; can be added with Cypress/Playwright against running api + dashboard.

---

## Tradeoffs & Limitations

- **SQLite default**: Easiest local setup; for production, use PostgreSQL and set `DB_TYPE=postgres` and connection vars.
- **Single JWT secret**: Fine for one app instance; for multi-instance, use the same secret or a shared verification key.
- **No refresh tokens**: Only access token; expiry is configurable via `JWT_EXPIRES`.
- **Audit log**: Append-only; no delete or edit. Viewable only by Owner/Admin.
- **No user/org CRUD UI**: Seed creates one org and one user; additional users/orgs would require backend endpoints and UI.
- **Drag-and-drop**: Reorder is implemented via status/orderIndex updates; full drag-and-drop list reorder can be added in the UI with a small backend change to accept bulk orderIndex updates.

---

## Future Improvements

- Refresh tokens and token revocation (e.g. allowlist/blocklist or DB).
- User registration and org creation flows.
- Invitations and org membership management.
- Real-time updates (WebSockets) for task list.
- Full drag-and-drop reorder with bulk PATCH for orderIndex.
- Rate limiting and request validation hardening.
- Optional 2FA (TOTP).

---

## Scaling Considerations

- **API**: Run multiple instances behind a load balancer; use shared PostgreSQL and same `JWT_SECRET`; consider Redis for sessions/rate limiting.
- **Frontend**: Static build; serve via CDN; ensure API URL is configurable (e.g. env at build time).
- **DB**: Indexes on `(organizationId, orderIndex)`, `(organizationId, createdAt)` for tasks and audit; connection pooling for Postgres.

---

## Security Hardening Plan

- Use strong `JWT_SECRET` in production (e.g. 32+ random bytes).
- Prefer PostgreSQL in production; disable TypeORM `synchronize` and use migrations.
- Add rate limiting (e.g. `@nestjs/throttler`) on login and public endpoints.
- Enforce HTTPS; set secure cookie flags if moving token to cookie.
- Sanitize and validate all inputs (already using class-validator DTOs).
- Restrict CORS to known frontend origins in production.
- Keep dependencies updated and run `npm audit`.

---

## Quick Reference

| Command | Description |
|--------|-------------|
| `npm run start:api` | Start NestJS API (port 3333) |
| `npm run start:dashboard` | Start Angular app (port 4200) |
| `npm run build` | Build api + dashboard |
| `npm run test` | Run all tests |
| `nx graph` | Show NX dependency graph (if Nx installed) |
