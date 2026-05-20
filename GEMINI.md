# SCH Tracker - Project Context

## Project Overview
**SCH Tracker** (Schedule Tracker) is a Next.js application designed to automate the process of converting raw text/chat data into structured installation schedules. It integrates with **Supabase** for database management and **Google Calendar** for automated event scheduling.

### Key Technologies
- **Frontend Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Backend & Auth**: Supabase (via `@supabase/ssr` and `@supabase/supabase-js`)
- **State Management & UI**: Radix UI, Lucide Icons, Sonner (for notifications), Recharts (for analytics)
- **Testing**: Jest & React Testing Library

## Directory Structure
- `src/app/`: Contains the application routes (App Router).
  - `activity/`, `jadwal/`, `tabel/`, `todo/`: Main functional modules.
  - `api/`: Backend API routes for schedule management and authentication.
- `src/components/`: Reusable React components.
  - `ui/`: Base UI components (Radix UI wrappers).
- `src/lib/`: Utility functions and shared library configurations (e.g., Supabase client).

## Building and Running
### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Environment Variables
Configure the following in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anonymous Key.
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (server-side only).
- `CLIENT_ID`: Google OAuth Client ID.
- `CLIENT_SECRET`: Google OAuth Client Secret.

## Development Conventions
### Routing
Follow the Next.js App Router conventions. Place page logic in `page.tsx` within the respective directory in `src/app/`.

### UI Components
Use the pre-built components in `src/components/ui/` for consistency. These are based on Radix UI and styled with Tailwind CSS.

### Testing
- Place test files alongside the component or page they test (e.g., `StatCard.test.tsx`).
- Run tests using:
  ```bash
  npm test
  ```

### Code Style
- Use TypeScript strict mode.
- Avoid bypassing the type system (e.g., using `any`).
- Follow the existing ESLint configuration (`eslint.config.mjs`).
