# P1 Fixes — Implementation Instructions

## Fix 8 — Email enumeration via registration
**File:** `server/src/modules/auth/auth.service.ts`
**Line:** 24

Change:
```
throw ApiError.conflict("A user with this email already exists");
```
To:
```
throw ApiError.conflict("Unable to process registration. Please try again.");
```

---

## Fix 9 — `getIO().close()` not awaited
**File:** `server/src/index.ts`
**Line:** 167

Change:
```
  getIO().close();
```
To:
```
  await getIO().close();
```

---

## Fix 10 — Shutdown handlers missing `.catch()`
**File:** `server/src/index.ts`
**Lines:** 178-179

Change:
```
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
```
To:
```
process.on("SIGTERM", () =>
  shutdown("SIGTERM").catch((err) => {
    console.error("[Server] SIGTERM shutdown failed:", err);
    process.exit(1);
  }),
);
process.on("SIGINT", () =>
  shutdown("SIGINT").catch((err) => {
    console.error("[Server] SIGINT shutdown failed:", err);
    process.exit(1);
  }),
);
```

---

## Fix 11 — Password regex missing `$` anchor
**File:** `server/src/modules/auth/dtos/auth.dto.ts`
**Line:** 3

Change:
```
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
```
To:
```
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;
```

---

## Fix 12 — Comment: "only access token jtis"
**File:** `server/src/modules/auth/token-blocklist.schema.ts`
**Line:** 13

Change:
```
 * - We only store access token jtis — refresh tokens are single-use by design
```
To:
```
 * - Both access and refresh token jtis are stored — refresh jtis are
 *   blocklisted on rotation (replay protection) and on logout
```

---

## Fix 13 — Comment: "responses will become orphaned"
**File:** `server/src/modules/polls/poll.repository.ts`
**Lines:** 86-89

Change:
```
  /**
   * Delete a poll by ID. This is a hard delete — polls have no regulatory
   * retention requirement in this context. Responses referencing the poll
   * will become orphaned; analytics routes should handle that gracefully.
   */
```
To:
```
  /**
   * Delete a poll by ID. This is a hard delete.
   * The service layer handles cascading deletion of associated responses
   * before calling this — see PollService.deletePoll().
   */
```

---

## Fix 14 — `findByResetToken` loads password hash
**File:** `server/src/modules/auth/auth.repository.ts`
**Lines:** 43-48

Change:
```
  static async findByResetToken(hashedToken: string): Promise<IUser | null> {
    return User.findOne({
      resetToken: hashedToken,
      resetTokenExpiresAt: { $gt: new Date() }, // token must not be expired
    }).lean();
  }
```
To:
```
  static async findByResetToken(hashedToken: string): Promise<IUser | null> {
    return User.findOne({
      resetToken: hashedToken,
      resetTokenExpiresAt: { $gt: new Date() }, // token must not be expired
    })
      .select("-password")
      .lean();
  }
```

---

## After All Edits

Run type-check:
```bash
cd server && npx tsc --noEmit
```
