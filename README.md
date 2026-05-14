# PollFlow

A production-grade full-stack polling and feedback platform. Create polls, collect anonymous or authenticated responses, view real-time analytics, and publish final results — all through a clean, fast interface backed by a robust REST API.

**Live Demo:** [pollflow.jdevs.codes](https://pollflow.jdevs.codes)

**API Base URL:** [api.pollflow.jdevs.codes/api/v1](https://api.pollflow.jdevs.codes/api/v1)

**Health Check:** [api.pollflow.jdevs.codes/health](https://api.pollflow.jdevs.codes/health)

---

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Backend](#backend)
  - [Architecture](#architecture)
  - [Folder Structure](#folder-structure)
  - [Database Design](#database-design)
  - [Authentication System](#authentication-system)
  - [API Reference](#api-reference)
  - [Real-Time System](#real-time-system)
  - [Analytics Pipeline](#analytics-pipeline)
  - [Security Measures](#security-measures)
  - [Backend Setup](#backend-setup)
- [Frontend](#frontend)
  - [Architecture](#frontend-architecture)
  - [Folder Structure](#frontend-folder-structure)
  - [Key Technical Decisions](#key-technical-decisions)
  - [Pages](#pages)
  - [Frontend Setup](#frontend-setup)
- [Deployment](#deployment)
- [Known Limitations](#known-limitations)

---

## Project Overview

PollFlow allows users to:

- **Create polls** with multiple questions, each having multiple single-select options
- **Configure** each question as mandatory or optional, and set a poll expiry time
- **Choose response mode** — anonymous (no attribution) or authenticated (respondent identified)
- **Share a public link or QR code** — anyone can respond, or restrict to logged-in users only
- **View live analytics** — response counts and option breakdowns update in real time via WebSockets as submissions come in, with animated counters and daily timeline charts
- **Publish results** — once closed, creators publish final results viewable by anyone on the same link
- **Export shareable results cards** — generate a branded PNG image of poll results (dark theme, progress bars, winner highlight) for posting on social media
- **Copy result summaries** — one-click clipboard snapshot with leading option and percentages for each question

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript (strict), Vite, Tailwind CSS v4, shadcn/ui |
| State | Zustand (auth store, token in memory — never localStorage) |
| Data fetching | TanStack Query v5 |
| Forms | React Hook Form + Zod resolvers |
| Charts | Recharts |
| Real-time (client) | Socket.io-client |
| Backend | Node.js, Express 5, TypeScript (strict) |
| Database | MongoDB Atlas (Mongoose ODM) |
| Real-time (server) | Socket.io (poll rooms, typed events) |
| Auth | JWT dual-token (access 15m / refresh 7d), httpOnly cookie, token blocklist |
| Validation | Zod (server + client) |
| Deployment | Railway (Express) + Vercel (React) |

---

## Backend

### Architecture

The backend follows a strict **4-layer modular architecture**. Every module (auth, polls, responses, analytics) follows the same pattern — no exceptions:

```
Route → Controller → Service → Repository → MongoDB
```

| Layer | Responsibility | What it must NOT do |
|---|---|---|
| **Route** | Register HTTP method + path, apply middleware | Any logic |
| **Controller** | Parse input (Zod), call service, return response | Business logic, DB calls |
| **Service** | All business rules, orchestration, auth checks | Direct DB calls |
| **Repository** | All Mongoose calls, data shaping | Business logic, ApiErrors |

This separation means:
- Swapping MongoDB for another DB only touches the repository layer
- Business rules are testable without HTTP context
- Controllers are pure input/output with zero logic — readable at a glance

Every controller is wrapped in `asyncHandler` — a single wrapper that catches any thrown error and forwards it to the global error handler. Zero duplicated try/catch blocks across the codebase.

---

### Folder Structure

```
pollflow/
├── client/                          # React frontend (deployed to Vercel)
│   └── src/
│       ├── api/                     # Axios instance + typed API functions
│       ├── components/ui/           # shadcn/ui auto-generated components
│       ├── hooks/                   # useSocket, useAuth, usePoll
│       ├── pages/                   # auth/, dashboard/, polls/, respond/
│       ├── store/                   # Zustand stores (auth token in memory)
│       └── types/                   # Shared TypeScript interfaces
│
└── server/                          # Express API (deployed to Railway)
    └── src/
        ├── common/
        │   ├── config/
        │   │   └── env.ts           # Zod-validated env — crashes fast on missing vars
        │   ├── db/
        │   │   └── index.ts         # Mongoose connection + graceful shutdown
        │   ├── middleware/
        │   │   ├── authenticate.middleware.ts      # requireAuth — verifies + blocklist check
        │   │   ├── optional-auth.middleware.ts     # optionalAuth — attaches user if present
        │   │   ├── error.middleware.ts             # Global error handler (last app.use)
        │   │   └── rate-limit.ts                  # Per-route rate limiters
        │   └── utils/
        │       ├── ApiError.ts          # Typed error class with factory methods
        │       ├── ApiResponse.ts       # Consistent response shape
        │       ├── async-handler.ts     # Wraps async controllers, forwards errors
        │       └── jwt.ts               # Token generation, verification, jti injection
        │
        └── modules/
            ├── auth/
            │   ├── user.schema.ts             # Mongoose User model
            │   ├── token-blocklist.schema.ts  # Revoked JTIs with TTL index
            │   ├── dtos/auth.dto.ts           # Zod schemas for all auth inputs
            │   ├── auth.repository.ts
            │   ├── auth.service.ts
            │   ├── auth.controller.ts
            │   └── auth.routes.ts
            ├── polls/
            │   ├── poll.schema.ts             # Poll + embedded questions/options
            │   ├── poll.dto.ts
            │   ├── poll.repository.ts
            │   ├── poll.service.ts
            │   ├── poll.controller.ts
            │   └── poll.routes.ts
            ├── responses/
            │   ├── response.schema.ts         # Sparse unique index for dedup
            │   ├── response.dto.ts
            │   ├── response.repository.ts
            │   ├── response.service.ts        # Core validation + socket emit
            │   ├── response.controller.ts
            │   └── response.routes.ts
            └── analytics/
                ├── analytics.service.ts       # MongoDB aggregation pipelines
                ├── analytics.controller.ts
                └── analytics.routes.ts
```

---

### Database Design

#### Schema Strategy: Hybrid Embed + Reference

| Collection | Strategy | Reason |
|---|---|---|
| `users` | Standalone | Independent entity, queried by email/id |
| `polls` | Embed questions + options | Questions have no meaning outside their poll. One atomic read fetches the entire structure. Never exceeds 16MB document limit. |
| `responses` | Separate collection | Grow unboundedly, queried independently for analytics, aggregation pipelines need them as top-level documents |
| `tokenblocklists` | Separate collection | TTL-indexed, auto-deleted at token expiry time |

#### Collections

**`users`**
```
_id, name, email (unique), password (bcrypt), resetToken?, resetTokenExpiresAt?, timestamps
```

**`polls`**
```
_id, title, description?, createdBy (ref: User), requiresAuth, isAnonymous,
status (active|expired|published), expiresAt, publishedAt?, totalResponses,
questions: [{ _id, text, isRequired, order, options: [{ _id, text, order }] }],
timestamps

Indexes:
  - createdBy: 1                     (get my polls)
  - createdBy: 1, createdAt: -1      (my polls sorted newest first)
  - status: 1, expiresAt: 1          (expiry sweep)
```

**`responses`**
```
_id, pollId (ref: Poll), respondentId? (ref: User, sparse),
answers: [{ questionId, optionId }], isAnonymous, ipAddress (select: false),
submittedAt, createdAt

Indexes:
  - pollId: 1                                         (all analytics queries)
  - pollId: 1, respondentId: 1 (unique, sparse)       (duplicate prevention)
  - pollId: 1, submittedAt: -1                        (timeline aggregation)
```

**`tokenblocklists`**
```
_id, jti (unique), userId, expiresAt, createdAt

Indexes:
  - jti: 1 (unique)           (O(1) revocation check on every request)
  - expiresAt: 1 (TTL: 0)    (auto-deleted by MongoDB at expiry time)
```

#### Why a separate `responses` collection instead of embedding in polls?

Embedding responses inside the poll document would hit MongoDB's 16MB document limit at ~50,000 responses. More importantly, analytics aggregations (`$unwind`, `$group`, `$facet`) require responses to be top-level documents — they cannot efficiently process deeply nested arrays at scale.

#### Duplicate Response Prevention

The unique sparse compound index `{ pollId: 1, respondentId: 1 }` on the responses collection enforces one response per authenticated user per poll at the database level. `sparse: true` is critical — it means the index only tracks documents where `respondentId` exists, so anonymous submissions (no respondentId) don't trigger false uniqueness conflicts against each other.

---

### Authentication System

PollFlow implements a **dual-token architecture** with full token lifecycle management:

```
Login → Access Token (15m, in React memory) + Refresh Token (7d, httpOnly cookie)
         ↓                                          ↓
   Authorization: Bearer <token>            Sent automatically by browser
         ↓                                          ↓
   requireAuth middleware               POST /auth/refresh → new token pair
         ↓
   Check TokenBlocklist (jti)
         ↓
   req.user = decoded payload
```

#### Token Security Details

| Feature | Implementation |
|---|---|
| **Access token storage** | Zustand memory only — wiped on tab close. Never localStorage. |
| **Refresh token storage** | httpOnly cookie, `secure: true` in production, `sameSite: none` for cross-domain |
| **Token type claim** | Every token carries `type: "access" \| "refresh"` — prevents token confusion attacks |
| **JTI (JWT ID)** | Every token has a unique `jti` (UUID v4) — enables per-token revocation |
| **Token blocklist** | On logout, access token's `jti` is stored in MongoDB with TTL = token expiry. Checked on every authenticated request. |
| **Token rotation** | Refresh endpoint issues both a new access token AND a new refresh token — old refresh token is invalidated |
| **Anti-enumeration** | Login returns identical error for "user not found" and "wrong password" |
| **Refresh replay detection** | On rotation, old refresh token's `jti` is blocklisted first via MongoDB unique index. If a concurrent request already rotated it, `E11000` fires and the replay is rejected atomically. |
| **Refresh on load** | `bootstrapAuth` fires on every page load — hits `/auth/refresh`, repopulates Zustand with fresh access token from the surviving httpOnly cookie |

#### `optionalAuth` Middleware

A custom middleware that reads and verifies a Bearer token if present, but silently continues without error if absent. Used on the poll response submission endpoint — this single endpoint correctly handles both anonymous guests and authenticated users without code duplication.

```
POST /polls/:pollId/respond
  → optionalAuth
  → req.user = decoded payload (if token valid)
  → req.user = undefined      (if no token or invalid)
  → ResponseService checks:
      if poll.requiresAuth && !req.user → 401
      if req.user → duplicate check applies
      if !req.user → anonymous path, IP stored for rate limiting
```

---

### API Reference

All endpoints are versioned under `/api/v1`.

#### Auth — `/api/v1/auth`

| Method | Path | Auth | Rate Limit | Description |
|---|---|---|---|---|
| POST | `/register` | — | 5/hr | Register new user |
| POST | `/login` | — | 10/15m | Login, returns access token + sets cookie |
| POST | `/logout` | ✅ Required | — | Blocklists jti, clears cookie |
| POST | `/refresh` | — | 30/15m | Rotates both tokens |
| GET | `/me` | ✅ Required | — | Get current user profile |
| POST | `/forgot-password` | — | 3/hr | Sends reset token |
| POST | `/reset-password` | — | 3/hr | Consumes reset token, updates password |

#### Polls — `/api/v1/polls`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | ✅ Required | Create a poll |
| GET | `/my` | ✅ Required | Get creator's polls |
| GET | `/:pollId` | Optional | Get poll by ID (visibility rules apply) |
| PATCH | `/:pollId` | ✅ Required | Update title/description/expiresAt |
| DELETE | `/:pollId` | ✅ Required | Delete poll |
| POST | `/:pollId/close` | ✅ Required | Close poll early (active → expired) |
| POST | `/:pollId/duplicate` | ✅ Required | Duplicate poll structure without responses |
| POST | `/:pollId/publish` | ✅ Required | Publish final results |

#### Responses — `/api/v1/polls`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/:pollId/respond` | Optional | Submit a response (anonymous or authenticated) |

#### Analytics — `/api/v1/analytics`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/:pollId` | ✅ Required | Full analytics dashboard (creator only) |
| GET | `/:pollId/results` | — | Published results (public, poll must be published) |

#### Standard Response Shape

All responses follow a consistent envelope:

```json
{ "success": true, "message": "...", "data": { } }
{ "success": false, "error": "Human-readable error message" }
```

---

### Real-Time System

Socket.io is used for live updates on two pages:
- **Poll-taking page** — respondents see a live response counter
- **Analytics dashboard** — creator sees option counts and percentages update in real time

#### Room Architecture

Two isolated room namespaces per poll — public clients and admin (creator) clients never share a room:

**Public Room — `public:poll:{pollId}`**
```
Client navigates to /polls/:pollId
  → emits "join:poll" with pollId
  → server: socket.join(`public:poll:${pollId}`)
  → server confirms: emits "room:joined"

Client navigates away
  → emits "leave:poll" with pollId
  → server: socket.leave(`public:poll:${pollId}`)
```

**Admin Room — `poll:admin:{pollId}`** (creator-only analytics)
```
Creator opens analytics dashboard
  → emits "join:poll:admin" with { pollId, token }
  → server: verifyAccessToken(token)
  → server: TokenBlocklist.exists({ jti })        ← revoked token check
  → server: Poll.findById(pollId).createdBy        ← ownership check
  → server: socket.join(`poll:admin:${pollId}`)    ← only if all checks pass
  → server confirms: emits "room:joined"
```

The two namespaces are structurally impossible to collide — `public:poll:admin:123` ≠ `poll:admin:123`.

#### Event Routing

| Direction | Event | Room Scope | Payload | Trigger |
|---|---|---|---|---|
| Client → Server | `join:poll` | — | `pollId: string` | User opens poll page |
| Client → Server | `join:poll:admin` | — | `{ pollId, token }` | Creator opens analytics |
| Client → Server | `leave:poll` | — | `pollId: string` | User navigates away |
| Server → Client | `room:joined` | Direct | `{ pollId, socketId }` | Confirms room join |
| Server → Client | `poll:response-count` | **Both rooms** | `{ pollId, totalResponses, timestamp }` | New response submitted |
| Server → Client | `poll:analytics-update` | **Admin only** | `{ pollId, totalResponses, questions[], timestamp }` | New response submitted |
| Server → Client | `poll:published` | Both rooms | `{ pollId, timestamp }` | Creator publishes results |
| Server → Client | `poll:expired` | Both rooms | `{ pollId, timestamp }` | Poll expiry detected |

Analytics breakdowns (option counts, percentages) are **never** broadcast to the public room — only the admin room receives `poll:analytics-update`. The public room sees only the count.

#### Emission Flow (after a response is submitted)

```
POST /polls/:pollId/respond
  → ResponseService.submitResponse()
  → ResponseRepository.create()               ← save to DB
  → PollRepository.incrementResponseCount()   ← $inc totalResponses atomically
  → emitResponseCount(pollId, total)          ← to public:poll:{id} (immediate, cheap)
  → AnalyticsService.getAnalyticsSnapshot()   ← aggregation pipeline
  → emitAnalyticsUpdate(pollId, snapshot)     ← to poll:admin:{id} (full breakdown)
```

### Analytics Pipeline

Option percentages and per-question answer counts are computed inside MongoDB using `$facet`, `$group`, `$map`, and `$round`. A lightweight completion summary is assembled in Node.js using the pipeline's pre-aggregated counts — no raw response documents are loaded into memory.

#### The Pipeline (`$facet` parallel execution)

```javascript
[
  { $match: { pollId: ObjectId(pollId) } },
  { $facet: {
    totalCount: [{ $count: "count" }],
    answerBreakdown: [
      { $unwind: "$answers" },
      { $group: { _id: { questionId: "$answers.questionId", optionId: "$answers.optionId" }, count: { $sum: 1 } } }
    ],
    dailyTimeline: [
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$submittedAt" } }, count: { $sum: 1 } } },
      { $sort: { date: 1 } }
    ],
    anonymousBreakdown: [
      { $group: { _id: "$isAnonymous", count: { $sum: 1 } } }
    ]
  }}
]
```

The only JS-side processing after this: merging question/option text (stored in the poll document) with the ObjectId-keyed counts from the pipeline. This is unavoidable — text lives in the poll document, not in responses — but it's a single `Poll.findById` + an O(n) merge of at most `questions × options` entries.

---

### Security Measures

| Measure | Implementation |
|---|---|
| Password hashing | bcryptjs, salt rounds from env (min 10) |
| JWT secrets | Minimum 32-character requirement enforced by Zod at startup |
| Token type confusion prevention | `type: "access" \| "refresh"` claim in every token |
| Token revocation | `jti` blocklist in MongoDB, TTL auto-cleanup |
| HTTP security headers | `helmet` |
| Rate limiting | Per-route: login 10/15m, register 5/hr, forgot-password 3/hr |
| CORS | Locked to `CLIENT_URL` env var — no wildcard |
| Anti-enumeration | Identical error for wrong email and wrong password |
| Input validation | Zod schemas on every endpoint |
| Cookie security | httpOnly, secure (production), sameSite: none, 7d maxAge |
| Env validation | Zod validates all env vars at startup — process exits on missing vars |

---

### Backend Setup

```bash
cd server
cp .env.example .env
npm install
npm run dev       # http://localhost:8080
```

Generate JWT secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Run twice — one for access secret, one for refresh secret.

---

## Frontend

### Frontend Architecture

The frontend is a single-page application built with React 19 and TypeScript in strict mode. It follows a **feature-layered structure** where concerns are separated by technical role:

```
URL hit → React Router (lazy-loaded page) → Page component
              ↓                                    ↓
         ProtectedRoute                    TanStack Query (server state)
         PublicOnlyRoute                   Zustand (auth state)
                                           useSocket (real-time)
                                           apiClient / plain axios (HTTP)
```

**State management is split by concern:**
- **TanStack Query** — all server state (polls, analytics). Handles caching, background refetch, and optimistic invalidation after mutations.
- **Zustand** — auth state only (user profile + access token). Synchronous, in-memory, never persisted.
- No prop drilling. No context for data fetching.

---

### Frontend Folder Structure

```
client/src/
├── api/
│   ├── axios.ts           # Axios instance — Bearer injection + silent refresh interceptor
│   ├── auth.ts            # Typed auth API functions
│   ├── polls.ts           # Typed poll + analytics API (public/private split)
│   └── responses.ts       # Response submission
│
├── components/
│   ├── layout/
│   │   └── AppLayout.tsx      # Authenticated shell — navbar + <Outlet />
│   ├── ui/                    # shadcn/ui components (auto-generated, untouched)
│   ├── ResultsCard.tsx        # Off-screen card rendered for html2canvas PNG export
│   └── QRCodeModal.tsx        # QR code generation dialog for poll sharing
│
├── hooks/
│   ├── useSocket.ts           # Socket.io room management + strict per-handler cleanup
│   ├── useCountdown.ts        # Poll expiry countdown with adaptive tick interval
│   └── useResultsCardExport.ts # html2canvas dynamic import + PNG download trigger
│
├── lib/
│   ├── utils.ts              # shadcn cn() helper
│   └── bootstrapAuth.ts      # Silent token restore on page load
│
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── ForgotPasswordPage.tsx
│   │   └── ResetPasswordPage.tsx
│   ├── dashboard/
│   │   └── DashboardPage.tsx
│   ├── polls/
│   │   ├── CreatePollPage.tsx
│   │   ├── EditPollPage.tsx
│   │   ├── AnalyticsPage.tsx
│   │   └── PollResultsPage.tsx
│   ├── respond/
│   │   └── RespondPage.tsx
│   ├── LandingPage.tsx
│   └── NotFoundPage.tsx
│
├── router/
│   └── index.tsx              # createBrowserRouter, ProtectedRoute, PublicOnlyRoute
│
├── store/
│   └── useAuthStore.ts        # Zustand — access token in memory, user profile
│
└── types/
    └── index.ts               # Shared TypeScript interfaces (mirrors backend shapes)
```

---

### Key Technical Decisions

#### 1. Access token lives in memory — never localStorage

The Zustand store holds the access token in JavaScript memory only. It is never written to `localStorage`, `sessionStorage`, or any browser storage API. On tab close or page refresh, the token is gone.

**The problem this creates:** the user would be logged out on every F5.

**The solution:** `bootstrapAuth` runs before React mounts. It hits `POST /auth/refresh` — the httpOnly cookie is sent automatically by the browser. If valid, the server returns a fresh access token, which populates Zustand. The user never sees a login page.

```ts
// main.tsx — bootstrap BEFORE render, render AFTER
bootstrapAuth().finally(() => root.render(<App />));
```

If the refresh cookie is expired or absent, `bootstrapAuth` fails silently and the user stays unauthenticated — `ProtectedRoute` will redirect them to login when they hit a guarded page.

#### 2. Silent refresh interceptor with queue pattern

The Axios instance has a response interceptor that catches 401s, calls `/auth/refresh`, updates Zustand, and replays the original request — transparently, without the component knowing a refresh happened.

A `failedQueue` prevents the thundering-herd problem: if 5 concurrent requests all 401 at the same moment, only one refresh fires. The other 4 queue behind it and replay once the refresh resolves.

#### 3. Public endpoints bypass the auth interceptor

`GET /polls/:pollId` and `GET /analytics/:pollId/results` are public routes. Using the auth-aware `apiClient` for these creates a risk: if they return an unexpected status, the interceptor fires a refresh attempt, which fires another refresh attempt, creating a rapid loop that freezes the browser.

These endpoints use plain `axios` with `withCredentials: true`. The interceptor is never involved.

```ts
// src/api/polls.ts
getById: (pollId) =>
  axios.get(`${BASE}/polls/${pollId}`, { withCredentials: true })  // plain axios
  .then(r => r.data),

create: (data) =>
  apiClient.post('/polls', data)  // apiClient — needs auth
  .then(r => r.data),
```

#### 4. useSocket — per-handler cleanup prevents duplicate events

The `useSocket` hook registers event listeners inside `useEffect` and deregisters them on cleanup using the exact same function reference:

```ts
// Stable wrapper defined inside effect — cleanup always matches
const handleAnalyticsUpdate = (payload) => { ... };
socket.on("poll:analytics-update", handleAnalyticsUpdate);

return () => {
  socket.off("poll:analytics-update", handleAnalyticsUpdate); // same reference
  socket.emit("leave:poll", pollId);
};
```

`socket.off(event)` without a function reference removes ALL listeners for that event — breaking other components. `socket.off(event, handler)` removes only the specific handler registered by this hook instance.

#### 5. navigate() called in useEffect, never during render

Calling `navigate()` directly in a component's render path updates `RouterProvider` state while a different component is rendering — React's "setState during render" violation. This triggers an infinite re-render loop that freezes the browser.

All navigation that depends on fetched data (e.g. redirect to results when `poll.status === "published"`) is wrapped in `useEffect`:

```ts
useEffect(() => {
  if (poll?.status === "published") navigate(`/polls/${pollId}/results`, { replace: true });
}, [poll?.status, pollId, navigate]);
```

#### 6. All forms use React Hook Form + Zod

Every form in the app (login, register, create poll, edit poll) uses `react-hook-form` with a `zodResolver`. The Zod schemas on the frontend mirror the backend DTOs exactly — same field names, same constraints, same error messages. Validation errors surface inline before any network request is made.

The poll creation form uses nested `useFieldArray` for dynamic questions and options, with `useFormContext` inside child components to read/write form state without prop drilling.

#### 7. Shareable results card — html2canvas with off-screen DOM

After a poll is published, a "Share Results" button generates a styled 1200px-wide PNG card. The card contains the poll title, total response count, per-option progress bars with percentages, a winner highlight, and PollFlow branding.

**Architecture:**

```
Button click → useResultsCardExport.exportCard()
  → set isExporting = true (disables button, shows spinner)
  → await import("html2canvas")     ← dynamic import, not in main bundle
  → await document.fonts.ready      ← ensures Inter font renders
  → html2canvas(cardRef.current)    ← captures off-screen <ResultsCard />
  → canvas.toDataURL("image/png")
  → <a download="...png">.click()   ← triggers browser download
  → toast.success / toast.error
```

**Key constraints handled:**
- **No Lucide icons** — html2canvas can't render SVG components from Lucide reliably. The card uses raw `<svg>` elements.
- **No Tailwind classes** — html2canvas evaluates CSS from computed styles only. The card uses 100% inline styles (hex/rgba colors, pixel dimensions).
- **No `oklch()` colors** — Tailwind v4 uses the `oklch()` color function which html2canvas can't parse. An `onclone` callback strips it from the cloned document before rendering.
- **Font preloading** — `document.fonts.ready` blocks capture until Inter is loaded and rasterized.
- **Not in main bundle** — html2canvas is 199 KB. It's loaded dynamically only when the user clicks export.
- **Not visible on page** — the card is rendered inside `position: fixed; top: -9999px; left: -9999px` with `aria-hidden="true"`. It's never painted to the viewport.

---

### Pages

| Route | Auth | Description |
|---|---|---|---|
| `/auth/login` | Public only | Login form. Redirects to `location.state.from` on success |
| `/auth/register` | Public only | Register form. Redirects to `location.state.from` on success |
| `/auth/forgot-password` | Public only | Request password reset — sends reset link |
| `/reset-password` | Public only | Consume reset token — sets new password |
| `/dashboard` | ✅ Protected | All user polls — status badges, response counts, action buttons |
| `/polls/create` | ✅ Protected | Poll creation — dynamic questions, options, expiry, settings |
| `/polls/:id/edit` | ✅ Protected | Edit active poll — pre-filled form |
| `/polls/:id/analytics` | ✅ Protected | Live analytics — animated counters, bar/line charts, socket updates, QR code, export results card |
| `/polls/:id/respond` | Public | Poll-taking page — radio options, countdown timer, socket expiry/publish handling |
| `/polls/:id/results` | Public | Published results — option breakdown with progress bars, download results card |
| `/` | Public | Landing page |

---

### Frontend Setup

```bash
cd client
cp .env.example .env
# Set VITE_API_URL=http://localhost:8080
npm install
npm run dev       # http://localhost:5173
```

**`client/.env.example`**
```env
# Backend base URL — no trailing slash
VITE_API_URL=http://localhost:8080
```

---

## Deployment

| Service | Platform | Root Directory | Build Command | Start Command |
|---|---|---|---|---|
| Frontend | [Vercel](https://vercel.com) | `client/` | `npm run build` | — (static) |
| Backend | [Railway](https://railway.app) | `server/` | `npm run build` | `npm start` |
| Database | [MongoDB Atlas](https://mongodb.com/atlas) | — | — | — |

### Environment Variables

**Backend (`server/`) — set these in Railway dashboard:**

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/pollflow?retryWrites=true&w=majority
JWT_ACCESS_SECRET=<32+ random hex chars>
JWT_REFRESH_SECRET=<32+ random hex chars>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=https://pollflow.jdevs.codes
BCRYPT_SALT_ROUNDS=10
RESEND_API_KEY=re_xxxxxxxxxxxx
```

**Frontend (`client/`) — set in Vercel dashboard → Environment Variables:**

```
VITE_API_URL=https://api.pollflow.jdevs.codes
```

Railway injects `PORT` automatically — do not set it manually. The health endpoint is at `GET /health`.

### CORS

The backend's `CLIENT_URL` env var locks CORS to the Vercel production origin — no wildcard. The refresh token cookie uses `sameSite: none` (required for cross-domain httpOnly cookies) with `secure: true` in production.

---

## Known Limitations

- **Railway free tier cold start:** The backend may take a few seconds to respond after inactivity (Railway sleeps free-tier services). The first request after a period of no traffic will be slow.
- **Email delivery requires Resend domain verification:** Forgot-password generates a reset token and sends it via Resend. In development without `RESEND_API_KEY`, the reset link is logged to the console and returned in the API response. In production, set `RESEND_API_KEY` and verify a sending domain in Resend's dashboard.
- **Poll editing is restricted:** Only `active` polls can be edited. Editing does not retroactively affect already-submitted responses.
- **Anonymous duplicate prevention:** Authenticated polls use DB-level unique index for deduplication. Anonymous polls use IP-based rate limiting — not a hard guarantee against re-submission.