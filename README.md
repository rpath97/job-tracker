# Job Tracker

A responsive Kanban workspace for managing a software engineering job search.

## Features

- Organise opportunities across Backlog, Applied, Interviews and Offers
- Add a job title, company, application date and listing URL
- Move jobs between stages from each card
- Search roles and companies instantly
- Delete outdated opportunities
- Email/password account access
- Cloud backup with Supabase, protected by Row Level Security
- Separate browser-only demo with sample jobs
- Responsive layout for desktop and mobile screens
- Navy and blue visual theme

## Stack

React, Vite, Tailwind CSS, Lucide React, and Supabase.

## Run locally

```bash
npm install
npm run dev
```

Create a `.env.local` file from `.env.example` and add the Supabase project URL and publishable key. Never use a secret or service-role key in the browser.

Run the database setup in `supabase/schema.sql` from the Supabase SQL Editor before signing in.

Create a production build with `npm run build`, check code quality with `npm run lint`, and run account-isolation regression tests with `npm test` (Node.js 22).

## Data isolation

Signed-in jobs are loaded from Supabase for the current user and are not cached in browser storage. A new account starts with an empty board. New jobs receive random UUIDs; existing database records and IDs are unchanged. Updates and deletions target both the job ID and user ID, with database access still enforced by Row Level Security.

Demo jobs use the separate `job-tracker-demo-v2` storage key. Demo changes are never imported into a signed-in account. The old `job-tracker-jobs-v1` cache has no reliable owner, so it is left untouched and is not read or imported. Previously cloud-saved jobs continue to load from Supabase; any local-only legacy data is not automatically restored.

Sign-out and account changes clear the displayed records immediately. Late responses from a previous session are discarded. Failed writes display an error instead of reporting successful cloud persistence.

## Checks

The GitHub workflow runs tests, lint, a production build, and redacted Gitleaks scans of current files and all reachable fetched branch/tag history. Automated secret detection is not a guarantee that all sensitive information is absent.

The regression suite uses simulated accounts and database responses. It does not access production credentials, create real users, modify existing cloud data, or certify live Row Level Security configuration.
