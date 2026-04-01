# Dance Planner — AI Assistant Guide

## Project Overview

Dance Planner is a mobile-first Progressive Web App (PWA) for tracking dance classes, packages, events, and teacher operations. It has **no custom backend** — all data is stored in the user's own Google Drive (via Google Sheets), with media files on Google Drive and optional Google Calendar sync.

Deployed via **Cloudflare Workers** (`wrangler.toml`). The Worker (`workers/notion-proxy.ts`) serves the built SPA via Workers Assets binding and injects COOP/COEP headers required for SharedArrayBuffer (FFmpeg WASM).

---

## Tech Stack

| Layer | Library / Version |
|-------|-------------------|
| Framework | React 19.2 + TypeScript 5.9 |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 + CSS custom properties |
| State | Zustand 5 |
| Auth | @react-oauth/google 0.13 |
| Icons | lucide-react |
| Notifications | react-hot-toast |
| Date utils | date-fns 4 |
| Local storage | idb 8 (IndexedDB) |
| Video encoding | @ffmpeg/ffmpeg 0.12 (WASM) |
| PWA | vite-plugin-pwa |

---

## Commands

```bash
npm run dev      # Vite dev server at localhost:5173 (HMR)
npm run build    # tsc -b && vite build → dist/
npm run lint     # ESLint check
npm run preview  # Preview production build locally
```

### Deployment

```bash
npm run build
wrangler deploy  # Publish to Cloudflare Workers (reads wrangler.toml)
```

---

## Repository Structure

```
/
├── src/
│   ├── App.tsx                  # Root; ErrorBoundary wraps AuthGate + tab nav
│   ├── main.tsx                 # ReactDOM entry point
│   ├── index.css                # Tailwind import + CSS custom properties
│   ├── components/              # 33+ React components
│   │   ├── *Tab.tsx             # Tab view pages
│   │   ├── *Form.tsx            # Modal forms (CRUD)
│   │   ├── *Card.tsx            # List item cards
│   │   ├── *Detail.tsx          # Detail view modals
│   │   └── AuthGate.tsx         # Google OAuth login gate
│   ├── store/
│   │   └── appStore.ts          # Single Zustand store (all state + actions)
│   ├── types/
│   │   └── index.ts             # All TypeScript interfaces and constants
│   ├── lib/
│   │   ├── googleSheets.ts      # Google Sheets API CRUD
│   │   ├── googleCalendar.ts    # Google Calendar event sync
│   │   ├── currency.ts          # Exchange rate fetch + conversion
│   │   ├── recurrence.ts        # Expand recurrence rules to occurrences
│   │   └── videoCompression.ts  # FFmpeg WASM video encoder
│   ├── db/
│   │   └── idb.ts               # IndexedDB wrapper (settings/rate cache)
│   └── assets/                  # Static images and SVGs
├── workers/
│   └── notion-proxy.ts          # Cloudflare Worker — SPA server with COOP/COEP
├── public/                      # Static assets (icons, manifest)
├── wrangler.toml                # Cloudflare Workers config
├── vite.config.ts               # PWA, COOP/COEP dev headers, FFmpeg optimization
├── tsconfig.app.json            # ES2023, strict, noUnusedLocals/Params
└── eslint.config.js             # Flat ESLint config (typescript-eslint + react-hooks)
```

---

## Architecture

### State Management
All application state lives in a single Zustand store: `src/store/appStore.ts`.

- **Data**: `packages`, `attendance`, `scheduledClasses`, `videos`, `events`, `teacherClasses`, `workshops`, `inscriptions`
- **Auth**: `googleToken`, `spreadsheetId`, sheet IDs
- **UI**: `activeTab`, `isFormOpen`, `editingPackage`, filter state
- **Settings**: `displayCurrency`, exchange rates, `autoCompleteClasses`, `monthlyBudget`, `teacherModeEnabled`

Actions fetch from Google Sheets, update local state, then persist back. Components read from the store via selectors.

### Data Layer (Google Sheets as DB)
The app reads and writes to the user's own Google Sheets spreadsheet named "Dance Planner". Nine sheets:

| Sheet | Contents |
|-------|----------|
| `packages` | Dance class packages |
| `attendance` | Attendance records |
| `schedule` | Recurring scheduled classes |
| `settings` | User preferences |
| `videos` | Video metadata (Drive file IDs) |
| `events` | Dance events (festivals, workshops attended) |
| `teacher_classes` | Classes the user teaches |
| `workshops` | Workshops the user hosts |
| `inscriptions` | Student enrollment records |

Row mapper functions follow the pattern `rowToX` / `xToRow` (e.g., `rowToPkg` / `pkgToRow`) in `src/lib/googleSheets.ts`.

### Local Cache (IndexedDB)
`src/db/idb.ts` wraps idb in a simple key/value store (`passinho-settings-v1`). Used for:
- Caching exchange rates for 6 hours
- Persisting settings locally

---

## Authentication

- **Provider**: Google OAuth 2.0 via `@react-oauth/google`
- **Client ID**: Hardcoded in `src/components/AuthGate.tsx`
- **Session**: 55-minute access token stored in `localStorage['gsession']` (JSON with token + spreadsheetId + sheetIds + expiresAt). No refresh tokens — user must re-authenticate after expiry.
- **Required scopes**:
  - `https://www.googleapis.com/auth/spreadsheets`
  - `https://www.googleapis.com/auth/drive.file`
  - `https://www.googleapis.com/auth/calendar.events`

---

## Styling Conventions

**Do not use CSS modules or styled-components.** The project uses:

1. **CSS custom properties** — defined in `src/index.css` (e.g., `--bg-base`, `--bg-card`, `--text-primary`, `--accent`, `--border`)
2. **Inline `style={{}}` objects** — all component-specific styling uses `style={{ color: 'var(--text-primary)' }}` pattern
3. **Tailwind classes** — used only for animations (`animate-slide-up`, `sheet-enter`) and layout utilities

Layout constraints:
- Mobile-first, max-width `430px`
- Safe area insets: `env(safe-area-inset-bottom)` for notched devices
- Full-viewport height: `100svh`

---

## Key Conventions

### Timestamps
All timestamps are **epoch milliseconds** (`number`). Use `Date.now()` for current time, `new Date(ts).toISOString()` for display.

### Currency / Prices
- Prices are stored in their `baseCurrency` field (one of `'CAD' | 'USD' | 'BRL'`)
- Always convert for display using `src/lib/currency.ts` helpers: `convert()`, `formatCurrency()`
- Exchange rates are fetched from `open.er-api.com` and cached 6 hours in IDB

### TypeScript
- Strict mode is enforced: `noUnusedLocals`, `noUnusedParameters`
- All interfaces are exported from `src/types/index.ts` — add new types there
- Target: ES2023

### Component Patterns
- Read from global Zustand store; keep local state only for transient UI (loading, animations)
- Event handlers use `e.preventDefault()` and `e.stopPropagation()` where needed to prevent bubbling through card clicks
- Forms are full-screen modals with backdrop blur

### No Tests
There are currently no test files or test frameworks configured.

---

## Critical Files Reference

| File | Role |
|------|------|
| `src/store/appStore.ts` | **All state and actions** — start here to understand data flow |
| `src/types/index.ts` | All TypeScript interfaces + `CARD_COLORS`, `DANCE_STYLES` constants |
| `src/lib/googleSheets.ts` | Google Sheets CRUD; row mapper functions |
| `src/lib/googleCalendar.ts` | Calendar sync; RRULE construction |
| `src/lib/currency.ts` | Exchange rate fetching, conversion, formatting |
| `src/lib/recurrence.ts` | Expand `RecurrenceRule` to individual occurrence timestamps |
| `src/lib/videoCompression.ts` | FFmpeg WASM H.264 encoder (lazy-loads ~30 MB WASM on first use) |
| `src/components/AuthGate.tsx` | Google OAuth login gate; session persistence |
| `src/db/idb.ts` | IndexedDB wrapper |
| `workers/notion-proxy.ts` | Cloudflare Worker SPA server |
| `wrangler.toml` | Cloudflare deployment config (Workers Assets, SPA mode) |

---

## Teacher Mode

Teacher Mode is a distinct UI mode toggled via settings:

- **TeacherClass**: Recurring classes the user teaches (with student pricing)
- **Workshop**: One-time workshops with capacity limits
- **Inscription**: Student enrollment records with payment tracking (`unpaid | partial | paid`)

Teacher Mode components live under the "Teaching" tab. All teacher data is stored in separate Google Sheets (`teacher_classes`, `workshops`, `inscriptions`).

---

## External APIs

| API | Purpose |
|-----|---------|
| Google Sheets API v4 | Primary data storage (read/write rows) |
| Google Drive API v3 | Spreadsheet discovery + video file upload/storage |
| Google Calendar API v3 | Optional sync of scheduled classes and events |
| `open.er-api.com` | Exchange rates (CAD base, cached 6h) |
| `ffmpeg.wasm` CDN | FFmpeg WASM binary (lazy-loaded on video upload) |

---

## Development Branch

Current feature branch: `claude/add-claude-documentation-wMWNC`

Push with:
```bash
git push -u origin claude/add-claude-documentation-wMWNC
```
