# Vantix Dashboard

Internal agency-operations dashboard.

---

## Database Setup

### Required environment variables

Create a `.env` file at the project root (copy `.env` and fill in real values):

| Variable              | Purpose                                              |
|-----------------------|------------------------------------------------------|
| `DATABASE_URL`        | PostgreSQL connection string (used by Prisma and the app) |
| `SEED_ADMIN_NAME`     | Full name for the initial admin user                 |
| `SEED_ADMIN_EMAIL`    | Email (login identifier) for the initial admin user  |
| `SEED_ADMIN_PASSWORD` | Plaintext password — hashed with bcrypt (cost 12) before storage |

Example `.env`:

```
DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/vantix_dashboard?schema=public"
SEED_ADMIN_NAME="Uma Mahesh"
SEED_ADMIN_EMAIL="admin@vantix.in"
SEED_ADMIN_PASSWORD="a_strong_password_here"
```

> **Never commit `.env` to version control.** It is listed in `.gitignore`.

---

### Running migrations

Make sure `DATABASE_URL` is set, then:

```bash
# Apply all pending migrations and generate the Prisma client
npx prisma migrate dev --name init
```

For production / CI environments (no interactive prompts, no dev-only behavior):

```bash
npx prisma migrate deploy
```

To inspect the current database state without changing it:

```bash
npx prisma migrate status
```

---

### Seeding the admin user

The seed script reads `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, and `SEED_ADMIN_PASSWORD` from `.env`. It is **idempotent** — running it twice with the same email will print a message and exit without creating a duplicate.

```bash
npm run seed:admin
```

The password is hashed with bcrypt (cost factor 12) before it touches the database. The plaintext value is never stored.

---

### Schema overview

| Table                  | Description                                                  |
|------------------------|--------------------------------------------------------------|
| `users`                | Authentication + role (admin / employee)                     |
| `clients`              | Client accounts, retainer amounts, contract details          |
| `employees`            | Employee profiles linked 1-to-1 with a user account         |
| `videos`               | Video production tasks linked to clients and editors         |
| `video_status_history` | Append-only audit trail of every video status transition     |
| `finance_entries`      | Income and expense ledger (amounts stored as integer rupees) |
| `activity_log`         | Append-only generic activity feed (no FK on `entity_id`)     |

All primary keys are UUID. All timestamps are UTC. Money columns are `INTEGER` (rupees, no decimals).
# vantixgrowth
