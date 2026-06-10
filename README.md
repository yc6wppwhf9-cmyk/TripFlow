# TripFlow — Corporate Travel Management Platform

AI-powered travel booking and approval system for enterprises. Employees describe their travel in plain language; Claude searches real flights, trains, and hotels, enforces company policies, and routes bookings through manager approval.

---

## Features

- **AI Chat Booking** — Employees chat with Claude to find and book travel. Includes **voice input** (mic button) in the chat widget.
- **Real Travel Prices** — Live data from Google Flights, IRCTC Railway, and Booking.com via RapidAPI.
- **Policy Enforcement** — Per-type spend limits (flight/hotel/train/cab) and global monthly budget caps. Violations blocked at API level.
- **Approval Workflow** — Bookings flow: Employee → Manager → Finance → Confirmed. Email notifications at each stage via Resend.
- **Multi-role Portals** — Separate dashboards for Employee, Manager, Admin, HR, and Vendor.
- **HR Analytics** — Department-wise spend, policy compliance rates, monthly booking trends.
- **JWT Auth** — Login + token refresh flow. Role-based access on every route.
- **Rate Limiting** — AI chat limited to 20 requests/min per user.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + Express 5 |
| Database | PostgreSQL (Supabase) via Prisma ORM |
| AI | Claude claude-sonnet-4-6 (Anthropic) — tool-use agentic loop |
| Cache / Queue | Redis (Upstash) + Bull |
| Email | Resend |
| Storage | Uploadthing |
| Travel APIs | Google Flights · IRCTC Railway · Booking.com (via RapidAPI) |

---

## Project Structure

```
TripFlow/
├── server.js                    # Entry point
├── prisma/
│   ├── schema.prisma            # DB schema
│   └── seed.js                  # Seed data
├── src/
│   ├── app.js                   # Express app + routes
│   ├── config/db.js             # Prisma client
│   ├── controllers/
│   │   ├── ai.controller.js     # Claude agentic chat loop
│   │   ├── auth.controller.js   # Login + JWT refresh
│   │   ├── booking.controller.js
│   │   ├── hr.controller.js     # HR analytics
│   │   └── ...
│   ├── services/
│   │   ├── travel.service.js    # Flights / Trains / Hotels APIs
│   │   ├── approval.service.js
│   │   └── ...
│   ├── routes/                  # One file per role
│   └── middleware/              # auth, role, validate
└── public/                      # Vanilla HTML frontends
    ├── employee.html
    ├── manager.html
    ├── admin.html
    ├── hr.html
    └── vendor.html
```

---

## Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill environment variables
cp .env.example .env

# 3. Push DB schema
npx prisma db push

# 4. Seed initial data (optional)
npm run prisma:seed

# 5. Start dev server
npm run dev
```

Server starts on `http://localhost:3000`

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase pooled connection string |
| `DIRECT_URL` | Supabase direct connection (for migrations) |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `ANTHROPIC_API_KEY` | Claude AI key — console.anthropic.com |
| `RAPIDAPI_KEY` | RapidAPI key (covers Flights, Trains, Hotels) |
| `RESEND_API_KEY` | Email API key — resend.com |
| `FROM_EMAIL` | Sender address for notifications |
| `REDIS_URL` | Upstash Redis connection string |
| `UPLOADTHING_TOKEN` | File upload token |
| `PORT` | Server port (default 3000) |

---

## Deploying to Render

1. Push this repo to GitHub.
2. Create a new **Web Service** on [render.com](https://render.com).
3. Connect your GitHub repo and set:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Region:** Singapore (closest to India)
4. Add all environment variables listed above.
5. After first deploy, open the Render **Shell** tab and run:
   ```
   npx prisma db push
   ```

---

## API Routes

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | Public | Login, returns JWT |
| POST | `/api/auth/refresh` | Public | Refresh JWT token |
| POST | `/api/ai/chat` | Employee | AI travel chat (20 req/min) |
| GET | `/api/bookings/suggestions` | Employee | Search flights/trains/hotels |
| POST | `/api/bookings` | Employee | Create booking |
| GET | `/api/bookings` | Employee | My bookings |
| PATCH | `/api/approvals/:id` | Manager/Finance | Approve or reject |
| GET | `/api/hr/dept-spend` | HR/Admin | Department spend breakdown |
| GET | `/api/hr/policy-compliance` | HR/Admin | Policy compliance stats |
| GET | `/api/hr/monthly-trend` | HR/Admin | 6-month booking trend |
| GET | `/api/admin/employees` | Admin | All employees |
| GET | `/api/vendor/bookings` | Vendor | Assigned bookings |

---

## How the AI Chat Works

1. Employee opens the chat widget and describes their trip in plain English (or uses the **mic button** for voice input — works in Chrome/Edge).
2. Claude detects the intent and calls the `search_travel` tool with the route and dates.
3. The backend fetches live prices from Google Flights / IRCTC / Booking.com.
4. Claude presents real options with prices in the chat.
5. Employee confirms a booking; Claude calls `create_booking`.
6. Policy limits are checked server-side (422 if exceeded).
7. Booking is created in `PENDING_MANAGER` stage and the manager receives an email notification.

---

## License

MIT
