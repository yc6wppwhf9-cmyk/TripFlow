# TripFlow - Corporate Travel Approval Platform

TripFlow is a full-stack corporate travel approval platform designed to streamline travel requests, approvals, and booking fulfillment.

## Features
- **Role-based Dashboards**: Custom interfaces for Employees, Managers, HR Admins, and Vendors.
- **AI-Powered**: Claude AI for generating professional emails and extracting rules from policy documents.
- **Async Processing**: Bull + Redis for reliable email and WhatsApp notifications.
- **Secure Storage**: Ticket uploads to AWS S3 with time-limited signed URLs.
- **Workflow State Machine**: Strict approval flow from submission to ticket issuance.

## Tech Stack
- **Backend**: Node.js, Express
- **ORM**: Prisma with PostgreSQL
- **Auth**: JWT & Bcrypt
- **Queues**: Bull & Redis
- **AI**: Anthropic SDK (Claude 3.5 Sonnet)
- **Email**: Nodemailer (SendGrid)
- **WhatsApp**: Twilio API
- **Storage**: AWS S3

## Setup Instructions

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL
- Redis
- AWS S3 Bucket
- SendGrid, Twilio, and Anthropic API Keys

### 2. Environment Setup
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Setup
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed initial data (HR, Manager, Sample Employees)
npm run prisma:seed
```

### 5. Run the Application
```bash
# For development
npm run dev

# For production
npm run start
```

## API Documentation

### Auth
- `POST /api/auth/login` - Login and get JWT
- `POST /api/auth/register` - Create new user/employee

### Bookings
- `GET /api/bookings/mine` - List employee's trips
- `POST /api/bookings` - Submit new trip request

### Approvals
- `GET /api/approvals/pending` - List team requests (Manager)
- `POST /api/approvals/:id/approve` - Approve and assign vendor
- `POST /api/approvals/:id/reject` - Reject with reason

### Vendor
- `GET /api/vendor/requests` - List approved requests assigned to vendor
- `POST /api/vendor/:id/upload-ticket` - Upload PNR and ticket (S3)

### Admin
- `GET /api/admin/stats` - Platform-wide statistics
- `POST /api/admin/policy` - AI extraction of travel policy
- `GET /api/admin/employees` - List all employees
