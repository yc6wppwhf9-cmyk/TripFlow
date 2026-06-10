# TripFlow

Corporate travel management platform for employee travel requests, policy enforcement, manager/HR approvals, vendor ticket fulfillment, and travel analytics.

TripFlow is a Node.js + Express application with a PostgreSQL database managed through Prisma. The frontend is a set of responsive static HTML dashboards served from `public/`.

## What It Does

- Employee travel booking with flight, train, hotel, cab, meal, and trip-package request types
- Multi-step request flow with policy checks, fare selection, hotel add-ons, and mobile-first UI polish
- AI travel assistant powered by Anthropic Claude for chat-based travel help
- Manager approval queue and department travel overview
- HR dashboard for employee management, policy assignment, vendor assignment, and analytics
- Admin dashboard for users, vendors, policies, bookings, and governance controls
- Vendor portal for assigned bookings, PNR entry, and ticket upload
- Notifications, email updates, password reset, and PWA manifest/service worker support
- Indian railway data support through local seeded rail station/train tables

## Tech Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js, Express 5 |
| Database | PostgreSQL with Prisma ORM |
| Frontend | Static HTML, CSS, vanilla JavaScript |
| Auth | JWT, bcrypt |
| AI | Anthropic Claude SDK |
| Email | Resend |
| Cache | Redis |
| Storage | Supabase Storage |
| Travel APIs | RapidAPI / Indian rail integrations plus local railway data |
| Deployment | Render |

## Project Structure

```text
TripFlow/
|-- server.js
|-- render.yaml
|-- package.json
|-- prisma/
|   |-- schema.prisma
|   |-- seed.js
|   |-- seed-trains.js
|   `-- import-trains-csv.js
|-- src/
|   |-- app.js
|   |-- config/
|   |-- controllers/
|   |-- middleware/
|   |-- routes/
|   |-- services/
|   `-- utils/
`-- public/
    |-- index.html
    |-- employee.html
    |-- request.html
    |-- mytrips.html
    |-- detail.html
    |-- manager.html
    |-- hr.html
    |-- admin.html
    |-- vendor.html
    |-- management.html
    |-- css/
    |-- js/
    `-- images/
```

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the project root and fill the required values.

Minimum required values for the server to start:

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="use-a-long-random-secret-at-least-32-characters"
```

3. Push the database schema:

```bash
npx prisma db push
```

4. Seed demo users and default policy:

```bash
npm run prisma:seed
```

5. Optional: seed railway data:

```bash
npm run prisma:seed-trains
```

6. Start the app:

```bash
npm run dev
```

Open the real app at:

```text
http://localhost:3000/index.html
```

Do not use the static preview server for login. A static server such as `localhost:4173` can show HTML/CSS pages, but it does not run `/api/*` routes.

## Demo Accounts

All seeded accounts use the same password:

```text
Welcome@123
```

| Role | Email |
| --- | --- |
| Admin | `admin@tripflow.com` |
| HR | `hr@tripflow.com` |
| Manager | `manager@tripflow.com` |
| Employee | `alice@tripflow.com` |
| Employee | `bob@tripflow.com` |
| Vendor | `vendor@travel.com` |

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `DIRECT_URL` | Recommended | Direct PostgreSQL connection for migrations |
| `JWT_SECRET` | Yes | JWT signing secret, minimum 32 characters |
| `PORT` | No | Server port, defaults to `3000` |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS allowlist |
| `APP_URL` | Recommended | Public app URL used in email links |
| `ANTHROPIC_API_KEY` | Optional | Enables Claude AI assistant and policy parsing |
| `RAPIDAPI_KEY` | Optional | Enables external travel search integrations |
| `INDIAN_RAIL_API_KEY` | Optional | Enables Indian rail API integration if configured |
| `RESEND_API_KEY` | Optional | Enables outbound emails |
| `FROM_EMAIL` | Optional | Sender address for emails |
| `REDIS_URL` | Optional | Redis connection for cache/login fail tracking |
| `SUPABASE_URL` | Optional | Supabase project URL for ticket storage |
| `SUPABASE_ANON_KEY` | Optional | Supabase key for storage upload |
| `INTERAKT_API_KEY` | Optional | WhatsApp notification integration |

## Main Pages

| Page | Purpose |
| --- | --- |
| `/index.html` | Login and registration |
| `/employee.html` | Employee dashboard and AI assistant |
| `/request.html` | New travel or meal request |
| `/mytrips.html` | Employee trip history |
| `/detail.html` | Booking detail and cancellation |
| `/manager.html` | Manager analytics and approval queue |
| `/hr.html` | HR operations, policies, vendor assignment, analytics |
| `/admin.html` | Admin controls for users, vendors, bookings, and policies |
| `/vendor.html` | Vendor fulfillment and ticket upload |
| `/management.html` | Executive management overview |

## API Overview

| Method | Path | Access |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Public |
| `POST` | `/api/auth/login` | Public |
| `POST` | `/api/auth/refresh` | Public |
| `POST` | `/api/auth/logout` | Authenticated |
| `POST` | `/api/auth/forgot-password` | Public |
| `POST` | `/api/auth/reset-password` | Public |
| `GET` | `/api/auth/me` | Authenticated |
| `GET` | `/api/bookings/mine` | Authenticated |
| `GET` | `/api/bookings/trip-plan` | Authenticated |
| `GET` | `/api/bookings/suggestions` | Authenticated |
| `POST` | `/api/bookings` | Employee, Manager |
| `GET` | `/api/bookings/:id` | Authenticated |
| `DELETE` | `/api/bookings/:id` | Authenticated |
| `POST` | `/api/bookings/:id/receipt` | Authenticated |
| `GET` | `/api/approvals/pending` | Manager, Admin |
| `GET` | `/api/approvals/team` | Manager, Admin |
| `POST` | `/api/approvals/:id/approve` | Manager, HR, Admin |
| `POST` | `/api/approvals/:id/reject` | Manager, HR, Admin |
| `GET` | `/api/approvals/hr/pending` | HR, Admin |
| `POST` | `/api/approvals/:id/assign-vendor` | HR, Admin |
| `GET` | `/api/admin/users` | HR, Admin |
| `GET` | `/api/admin/employees` | HR, Admin |
| `GET` | `/api/admin/vendors` | HR, Admin |
| `GET` | `/api/admin/bookings` | HR, Admin |
| `GET` | `/api/admin/policies` | HR, Admin |
| `POST` | `/api/admin/users` | HR, Admin |
| `POST` | `/api/admin/policies` | HR, Admin |
| `POST` | `/api/admin/policies/assign` | HR, Admin |
| `POST` | `/api/admin/policies/analyze` | HR, Admin |
| `GET` | `/api/hr/dept-spend` | HR, Admin |
| `GET` | `/api/hr/policy-compliance` | HR, Admin |
| `GET` | `/api/hr/monthly-trend` | HR, Admin |
| `GET` | `/api/hr/management-stats` | HR, Admin |
| `GET` | `/api/vendor/requests` | Vendor |
| `GET` | `/api/vendor/completed` | Vendor |
| `POST` | `/api/vendor/:id/upload-ticket` | Vendor |
| `POST` | `/api/ai/chat` | Employee |
| `GET` | `/api/notifications` | Authenticated |
| `PATCH` | `/api/notifications/:id/read` | Authenticated |
| `GET` | `/health` | Public |

## Booking Workflow

```text
Employee creates request
        ↓
PENDING_MANAGER
        ↓ manager approves
PENDING_HR
        ↓ HR assigns vendor
PENDING_VENDOR
        ↓ vendor uploads ticket / PNR
COMPLETED
```

Rejected and cancelled bookings move to `REJECTED` or `CANCELLED`.

## Scripts

| Command | Description |
| --- | --- |
| `npm start` | Run production server |
| `npm run dev` | Run with nodemon |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run Prisma migration workflow |
| `npm run prisma:seed` | Seed users, vendor, and default policy |
| `npm run prisma:seed-trains` | Seed railway reference data |
| `npm run prisma:import-csv` | Import railway CSV data |

## Deployment

The repository includes `render.yaml`.

Render settings:

- Build command: `npm install`
- Start command: `node server.js`
- Health check: `/health`

After first deploy, run:

```bash
npx prisma db push
npm run prisma:seed
```

Only seed production intentionally. `prisma/seed.js` refuses to run in production unless `ALLOW_PROD_SEED=true`.

## Notes

- The frontend is served by Express from `public/`.
- The mobile UI has a premium travel-app treatment with floating navigation, polished itinerary cards, and responsive request flows.
- If login returns an API unavailable message, make sure you are using the Express server URL, not a static preview server.

## License

ISC
