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
- Browser storage fallback when cloud access is not configured
- Responsive layout for desktop and mobile screens
- Light and dark theme support through the user's system preference

## Stack

React, Vite, Tailwind CSS, Lucide React, and Supabase.

## Run locally

```bash
npm install
npm run dev
```

Create a `.env.local` file from `.env.example` and add the Supabase project URL and publishable key.

Run the database setup in `supabase/schema.sql` from the Supabase SQL Editor before signing in.

Create a production build with `npm run build` and check code quality with `npm run lint`.
