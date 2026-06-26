# AI Laptop Security Scanner

Real-time malware detection and security monitoring dashboard. Built with Node.js + Express + SQLite3 + React.

## Features

- **Real-time File Scanning** — Monitors files for malware patterns
- **Security Dashboard** — Visual analytics with threat timeline and risk distribution
- **Notification System** — Persistent notification preferences with backend storage
- **Scan History** — Complete audit trail of all scans with export options
- **Findings Table** — Searchable, filterable table of all scan results

## Tech Stack

- **Backend:** Node.js, Express, SQLite3
- **Frontend:** React, Vite, Tailwind CSS, Recharts, Framer Motion
- **Real-time:** Server-Sent Events (SSE)

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/nehaaagre16-create/-AI-Laptop-Security-Scanner.git
cd -AI-Laptop-Security-Scanner

# Install backend dependencies
npm install

# Install frontend dependencies
cd dashboard-new
npm install

# Build the frontend
npm run build

# Copy build to dashboard folder
cp -r dist/* ../dashboard/

# Go back to root and start the server
cd ..
npm start
```

### Access the Dashboard

Open your browser and go to: `http://localhost:3000`

## Default Configuration

- **Port:** 3000
- **Database:** SQLite (`reports/scans.db`)
- **Default Scan Folder:** `/home/paperclip`
- **Background Scan Interval:** 30 minutes

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/scan/status` | GET | Current scan status and metrics |
| `/scan/start` | POST | Start a manual scan |
| `/reports/history` | GET | Scan history |
| `/threats` | GET | All threats |
| `/api/notifications` | GET | Notification preferences |
| `/api/notifications` | POST | Update notification preferences |
| `/api/config/folder` | GET/POST | Scan folder configuration |
| `/alerts` | SSE | Real-time alert stream |

## Project Structure

```
├── src/
│   ├── server.js              # Express server
│   ├── database/
│   │   └── db.js              # SQLite database operations
│   ├── scanner/
│   │   ├── scanManager.js     # Scan orchestration
│   │   ├── fileScanner.js     # File system scanning
│   │   └── hashGenerator.js   # File hash calculation
│   ├── security/
│   │   ├── threatAnalyzer.js  # Threat detection logic
│   │   └── solutions.js       # Remediation advice
│   ├── routes/
│   │   ├── scan.js            # Scan API routes
│   │   └── reports.js         # Reports API routes
│   └── utils/
│       └── pathResolver.js    # Cross-platform path handling
├── dashboard-new/             # React frontend source
│   ├── src/
│   │   ├── App.jsx
│   │   └── components/
│   └── package.json
├── dashboard/                 # Built frontend (served by Express)
└── reports/                   # Database and generated reports
```

## Development

### Backend Development

```bash
npm run dev
```

### Frontend Development

```bash
cd dashboard-new
npm run dev
```

## License

ISC
