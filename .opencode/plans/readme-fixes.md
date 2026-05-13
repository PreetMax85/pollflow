# README Fixes — Implementation Instructions

## Fix A — Soften analytics overclaim

**File:** `README.md`
**Line:** 368

Change:
```
All analytics are computed inside MongoDB using the aggregation framework. Zero mathematical operations happen in Node.js memory.
```
To:
```
Option percentages and per-question answer counts are computed inside MongoDB using $facet, $group, $map, and $round. A lightweight completion summary is assembled in Node.js using the pipeline's pre-aggregated counts — no raw response documents are loaded into memory.
```

---

## Fix B — Fix stale socket room prefix

**File:** `README.md`
**Lines:** 330, 335

Change BOTH occurrences:
```
`poll:${pollId}`
```
To:
```
`public:poll:${pollId}`
```

---

## Fix C — Replace the entire Room Architecture section

**File:** `README.md`
**Lines:** 325-351

Replace ALL content from `#### Room Architecture` through the `#### Events` table and `#### Emission Flow` section with the following expanded documentation:

```
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

---

## Fix D — Add "Atomic refresh replay detection" bullet

**File:** `README.md`
**Line:** After line 249 (after the Token Security table)

Insert a new row in the Token Security table after "Anti-enumeration":

| **Refresh replay detection** | On token rotation, the old refresh token's `jti` is blocklisted first via MongoDB unique index. If a concurrent request already rotated it, `E11000` fires and the replay is rejected atomically. |

---

## Fix E — Add missing API rows

**File:** `README.md`
**Lines:** After line 293 (inside Polls API table)

Insert two rows after `DELETE /:pollId`:

| POST | `/:pollId/close` | ✅ Required | Close poll early (active → expired) |
| POST | `/:pollId/duplicate` | ✅ Required | Duplicate poll structure without responses |

---

## After All Edits

Verify rendering:
```bash
# README is plain markdown — just visually inspect the sections
```
