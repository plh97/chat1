# Chat SaaS Admin

The platform administration frontend is intentionally a separate Vite app.
It can be deployed independently from the customer chat application while the
first SaaS iteration keeps one modular Go backend.

## Local preview

```bash
pnpm dev:admin
```

The admin frontend runs on port `9002`. Requests under `/api` are proxied to
the existing Go backend on port `8000`; this command does not start the backend.

Use the seeded platform owner for a fresh local database:

- Email: `admin@gmail.com`
- Password: `123456`

Tenants and users created in this control center are written to the existing
Go API. A new tenant is provisioned with its owner account and a `General`
room; users can optionally join that room when they are created.

## Vercel

Create a second Vercel project from the same repository:

- Root directory: `packages/admin`
- Framework preset: Vite
- Build command: `pnpm build`
- Output directory: `dist`
- Suggested domain: `admin.c.plhh.org`
- Environment variable: `VITE_API_BASE_URL=https://your-api.example.com/v1`

The application requires a `platform_owner` or `platform_admin` JWT. Its
tenant, user, usage and health screens use the platform API; billing currently
shows plan/trial records only and does not create invoices or payments.
