# Institute Management & Exam System (IMS)

A full-stack Institute Management and Online Examination System built with **Node.js / Express.js**, **MongoDB Atlas**, and **React + Vite** frontend.

---

## Project Structure

```
IMS/
├── server/           # Node.js + Express.js + TypeScript backend
│   ├── src/
│   │   ├── app.ts              # Express application entry
│   │   ├── config/             # Environment config + DB connection
│   │   ├── models/             # Mongoose models (15 collections)
│   │   ├── controllers/        # Business logic controllers
│   │   ├── routes/             # Express routers
│   │   ├── middleware/         # Auth, error handling
│   │   └── utils/              # Audit log, ID generators, shuffler
│   └── scripts/
│       └── seed.ts             # DB seed (admin + default settings + batches)
└── client/           # React + Vite + TypeScript + Tailwind CSS frontend
    └── src/
        ├── pages/              # All pages (admin + exam portal)
        ├── components/         # Reusable UI components
        ├── layouts/            # Admin layout (sidebar + topbar)
        ├── context/            # Auth context
        ├── services/           # Axios API client
        └── types/              # TypeScript interfaces
```

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier works)
- Git

### 1. Configure Environment

```bash
cd server
cp .env.example .env
```

Edit `server/.env` and fill in your MongoDB Atlas URI and JWT secrets:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/ims
JWT_SECRET=your_very_strong_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
```

### 2. Install Dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install --legacy-peer-deps
```

### 3. Seed the Database (First Time)

```bash
cd server
npm run seed
```

This creates:
- Default admin account: `admin` / `Admin@123`
- Default exam settings
- All batch time slots (Daily, Alternate, Weekly)

> ⚠️ **Change the admin password immediately after first login!**

### 4. Run Development Servers

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
# Running at http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
# Running at http://localhost:5173
```

---

## Access URLs

| Portal | URL |
|--------|-----|
| Admin Login | http://localhost:5173/login |
| Admin Dashboard | http://localhost:5173/dashboard |
| Student Exam Portal | http://localhost:5173/exam |
| Backend API Health | http://localhost:5000/api/health |

---

## Features Implemented

### ✅ Admin Panel
- **Dashboard** — Real-time stats, enrollment trends, status distribution charts
- **Students** — Full CRUD, search/filter, module enrollment, batch assignment, cancellation
- **Faculty** — Register and manage faculty members
- **Batches** — View Daily/Alternate/Weekly batch slots and enrolled students
- **Courses & Modules** — Create courses with modules, manage question banks per module
- **Attendance** — Coming Soon (locked per specification)

### ✅ Examination System
- **Exam Credentials** — Generate unique exam username + password per student
- **Exam Form Tab** — Generate/reset credentials per student lookup
- **Student Details Tab** — View all credential records
- **Recent Exams** — Monitor live and recent exam attempts
- **Exam Logs** — Full searchable exam attempt history

### ✅ Online Exam (Student Portal `/exam`)
- Secure login with exam credentials (separate JWT)
- Module selection dashboard
- Resume in-progress exams
- 42-question exam: 10 Basic + 10 Mid + 20 Advanced + 2 Practical
- MCQ with A/B/C/D options
- Code textarea for practical questions
- Countdown timer with auto-submit on expiry
- Auto-save every 30 seconds
- Question navigator panel

### ✅ Results & Re-Exams
- Auto-evaluate objective questions on submission
- Pending Practical tab for faculty code evaluation (0–5 per question)
- Pass/Fail based on configurable passing marks (default: 40)
- Check Results by Student ID
- All Results with status filter
- Re-exam authorization for failed modules

### ✅ Question Bank
- Excel upload with 4 worksheets (Basic, Mid, Advanced, Practical)
- Full validation with error reporting
- Preview mode before confirming import
- Version history tracking
- Automatic replacement of old bank on new upload

### ✅ Settings
- General settings (institute name, address, fees)
- Exam configuration (duration, passing marks, question distribution)
- Question bank management
- Admin credential change

### ✅ Audit Logs
- Complete append-only audit trail for all administrative actions
- Searchable by action, entity type, actor, and date range

---

## Excel Question Bank Format

The Excel file must have exactly **4 worksheets**:

| Sheet | Columns |
|-------|---------|
| **Basic** | Question No., Question, A Option, B Option, C Option, D Option, Correct Option |
| **Mid** | Question No., Question, A Option, B Option, C Option, D Option, Correct Option |
| **Advanced** | Question No., Question, A Option, B Option, C Option, D Option, Correct Option |
| **Practical** | Question No., Question |

- Correct Option column must be: `A`, `B`, `C`, or `D`
- Practical questions have no options (open code/text answer)

---

## API Overview

| Base | Endpoint | Description |
|------|----------|-------------|
| `/api/v1/auth` | POST `/login`, GET `/me` | Admin authentication |
| `/api/v1/students` | CRUD + `/cancel` | Student management |
| `/api/v1/faculty` | CRUD | Faculty management |
| `/api/v1/courses` | CRUD + `/modules` | Course/module management |
| `/api/v1/batches` | GET + `/students` | Batch slot management |
| `/api/v1/question-banks` | POST `/upload`, GET | Excel import |
| `/api/v1/exams` | Credentials + attempts | Exam management |
| `/api/v1/exam/access` | POST `/login`, GET `/me` | Student exam auth |
| `/api/v1/exam/attempts` | Start/save/submit | Exam engine |
| `/api/v1/results` | Results + practical eval + re-exams | Results |
| `/api/v1/settings` | GET/PATCH | App settings |
| `/api/v1/audit-logs` | GET | Audit trail |
| `/api/v1/dashboard` | Summary + analytics | Dashboard stats |

---

## Security Notes

- Admin sessions use **HTTP-only cookies** (access + refresh tokens)
- Student exam sessions use a **separate JWT** scoped to exam operations only
- `correctOption` field is **excluded from all student-facing queries** (select: false in Mongoose)
- Rate limiting on login endpoints
- Helmet.js security headers
- All mutations are logged in the audit trail
