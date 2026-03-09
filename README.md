# PlateInsight

PlateInsight is a multi-ecosystem campus food intelligence platform built with Next.js and Supabase.

It helps institutions:
1. Track food waste from student meal feedback.
2. Route edible leftovers to NGOs (Helping Hand).
3. Route non-edible waste to recyclers (Waste2Resource).

## Core Modules

1. Admin Portal
- Ecosystem-level monitoring
- Staff management and verification
- Waste analytics, dish insights, reports, and settings

2. Staff Portal
- Meal/session operations
- Menu and feedback operations
- Raise leftover food tokens for NGO pickup
- Raise waste collection tokens for recycler pickup

3. Student Flow
- Quick submission flow with camera capture
- AI analysis + feedback path
- Demo mode support (`/student/welcome?demo=1`)

4. Helping Hand (NGO)
- NGO signup/login/dashboard
- Claim edible leftover food tokens
- View claimed history

5. Waste2Resource (Recycler)
- Recycler signup/login/dashboard
- Claim non-edible waste tokens
- View claimed history

## Tech Stack

1. Next.js (App Router)
2. TypeScript
3. Tailwind CSS + shadcn-style UI components
4. Supabase (Auth, Postgres, Storage, RLS)
5. Recharts for dashboard charts
6. Jest + Playwright for test coverage

## Important Routes

1. Home: `/`
2. Interactive demo: `/demo`
3. Student flow: `/student/welcome`, `/student/capture`, `/student/result`, `/student/success`
4. Admin: `/admin/login`, `/admin/dashboard`
5. Staff: `/staff/login`, `/staff/dashboard`, `/staff/leftover-food`, `/staff/waste-collection`
6. NGO: `/ngo/signup`, `/ngo/login`, `/ngo/dashboard`
7. Recycler: `/recycler/signup`, `/recycler/login`, `/recycler/dashboard`

## Database

Main schema file:
- `supabase.sql`

Includes:
1. Multi-ecosystem model (`ecosystems`, `public.users`, etc.)
2. Feedback tables (`submissions`, `dish_feedback`, etc.)
3. Helping Hand tables (`ngos`, `leftover_food`)
4. Waste2Resource tables (`recyclers`, `waste_collection_tokens`)
5. RLS policies and helper functions

Additional SQL files:
- `ecosystem_code_migration.sql`
- `storage.sql`

## Environment Variables

Create `.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Local Development

Install dependencies:

```bash
npm install
```

Run dev server:

```bash
npm run dev
```

If you face Windows worker/permission issues, use:

```bash
npm run dev:safe
```

Clean local build cache:

```bash
npm run clean:next
```

## Testing

Type check:

```bash
npx tsc --noEmit
```

Unit tests:

```bash
npm test
```

E2E tests:

```bash
npm run test:e2e
```

## Production Build

```bash
npm run build
npm run start
```

## Notes

1. `.gitignore` is configured to exclude secrets, build artifacts, and local caches.
2. Playwright is configured to run against a stable local port for reliable E2E runs.
3. Current app metadata title is `PlateInsight`.
  
