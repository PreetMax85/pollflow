import { Router } from "express";
import { PollController } from "./poll.controller.js";
import { asyncHandler } from "../../common/utils/async-handler.js";
import { requireAuth } from "../../common/middleware/authenticate.middleware.js";
import { optionalAuth } from "../../common/middleware/optional-auth.middleware.js";

const router = Router();

// Creator operations (authentication required)

// GET  /api/v1/polls/my          — get all my polls (paginated)
router.get("/my", requireAuth, asyncHandler(PollController.getMyPolls));

// POST /api/v1/polls              — create a new poll
router.post("/", requireAuth, asyncHandler(PollController.create));

// PATCH /api/v1/polls/:pollId    — update poll title / description / expiresAt
router.patch("/:pollId", requireAuth, asyncHandler(PollController.update));

// DELETE /api/v1/polls/:pollId   — delete a poll
router.delete("/:pollId", requireAuth, asyncHandler(PollController.deletePoll));

// POST /api/v1/polls/:pollId/close — close poll early (active → expired)
router.post("/:pollId/close", requireAuth, asyncHandler(PollController.close));

// POST /api/v1/polls/:pollId/publish — publish final results
router.post("/:pollId/publish", requireAuth, asyncHandler(PollController.publish));

// POST /api/v1/polls/:pollId/duplicate — duplicate a poll
router.post("/:pollId/duplicate", requireAuth, asyncHandler(PollController.duplicate));

// Public operations

// GET /api/v1/polls/:pollId      — get poll by ID (public link, results page)
// optionalAuth: if token present, service knows requester is creator
router.get("/:pollId", optionalAuth, asyncHandler(PollController.getById));

export { router as pollRoutes };
