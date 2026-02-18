# Architecture & Flows

This document aligns with the core evaluation criteria: relationships, organization hierarchy, authentication, and RBAC.

---

## 📌 Relationships Flow

```
Organization
   ↓
Users belong to Organization
   ↓
Users have Roles
   ↓
Roles have Permissions
   ↓
Users create/manage Tasks
```

- **Organization**: Top-level tenant (e.g. Company or Department).
- **User**: Belongs to one Organization; has one **Role** (Owner, Admin, Viewer).
- **Role → Permissions**: Each role has a set of permissions (e.g. `task:create`, `task:read`, `audit:read`). Access is enforced by **Permission Check** after **Role Guard**.
- **Tasks**: Scoped by organization; users create/manage tasks according to their permissions and org-level access.

---

## 📌 Organization Hierarchy (2 Levels)

- **Level 1 – Company** (e.g. `parentId = null`)
- **Level 2 – Department** (e.g. `parentId = Company.id`)

**Access rule**: A user can access data only for their **organization and its direct children**.

- User in a **Department**: sees only that department’s tasks (and audit for that org).
- User in a **Company**: sees that company’s tasks **and** all tasks of departments under that company (same for audit).

Implementation: `OrganizationService.getAllowedOrganizationIds(user)` returns `[user.organizationId, ...childOrgIds]`. All task and audit queries filter by `organizationId IN (allowedOrgIds)`.

---

## 🔹 STEP 3 — Authentication System

**Deliverables**

| Deliverable | Implementation |
|------------|----------------|
| ✔ Register User | `POST /auth/register` – creates user + org, returns JWT |
| ✔ Login API | `POST /auth/login` – validates credentials, returns JWT |
| ✔ JWT token generation | Issued on login/register; signed with `JWT_SECRET` |
| ✔ Token validation | Passport JWT strategy + `AuthGuard('jwt')` on protected routes |

**Flow**

```
User Login (or Register)
   ↓
Verify Credentials
   ↓
Generate JWT Token
   ↓
User sends token in future requests (Authorization: Bearer <token>)
   ↓
Token validation middleware (AuthGuard) runs first on protected routes
```

The dashboard sends the token via the **auth interceptor** (`Authorization: Bearer <token>`). The API validates the token and attaches `req.user` (id, email, organizationId, role) for guards and services.

---

## 🔹 STEP 4 — RBAC (Role-Based Access Control)

**Roles**

| Role | Access |
|------|--------|
| **Owner** | Full access: create, read, update, delete tasks; read audit |
| **Admin** | Manage tasks in organization: create, read, update, delete tasks; read audit |
| **Viewer** | Read-only: list and view tasks; no create/update/delete; no audit |

**Permissions** (derived from role)

- `task:create`, `task:read`, `task:update`, `task:delete`, `audit:read`
- Owner & Admin have all of the above; Viewer has only `task:read`.

**Request flow**

```
API Request
   ↓
Authentication Guard (JWT valid? → req.user)
   ↓
Role Guard (user.role in allowed roles for this route?)
   ↓
Permission Check (user’s role has required permission?)
   ↓
Allow or Deny
```

**Implementation**

- **Authentication Guard**: `AuthGuard('jwt')` – validates token and sets `req.user`.
- **Role Guard**: `RolesGuard` + `@Roles(Role.Viewer, Role.Admin, Role.Owner)` – ensures user has one of the allowed roles.
- **Permission Check**: `PermissionsGuard` + `@RequirePermissions(Permission.TASK_CREATE)` (etc.) – ensures the user’s role has the required permission.

Tasks controller uses both `@Roles` and `@RequirePermissions` so that:
- Who can **create/update/delete** tasks is controlled by role + `TASK_CREATE` / `TASK_UPDATE` / `TASK_DELETE`.
- Who can **view** tasks is controlled by `TASK_READ` (Viewer included).
- Audit is restricted to Owner/Admin and `AUDIT_READ`.

All task and audit access is further restricted by **organization level** via `getAllowedOrganizationIds(user)`.
