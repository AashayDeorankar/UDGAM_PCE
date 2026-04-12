# TPO Panel (Separate Platform)

This is a dedicated frontend platform for TPO users.

- Separate app root: `tpo-panel/`
- Separate dev port: `5174`
- Separate preview port: `4174`

## What TPO can do

- Login with TPO account (`role: "tpo"` in Firestore `users/{uid}`)
- See only users from their own college (`collegeName`/`managedCollegeName` mapping)
- View student dashboard with:
  - Progress percentage
  - Assessment score
  - Attempt count
  - Status (On Track / Improving / Needs Attention)
- View alumni list for the same college

## Data assumptions

Firestore `users/{uid}` should contain:

- `role`: `student | alumni | tpo`
- `collegeName`: string
- For TPO users optionally: `managedCollegeName`

Interview reports are read from `mockInterviewReports` collection and aggregated per student.

## Setup

1. Copy `.env.example` to `.env` and fill Firebase values.
2. Install dependencies:

```bash
npm install
```

3. Run TPO app:

```bash
npm run dev
```

Open: http://localhost:5174

## Security note

This frontend filters by college and validates `role === "tpo"`, but production isolation should also be enforced in Firestore security rules and backend APIs.
