import { Response } from "express";
import { PollService } from "./poll.service.js";
import { ApiResponse } from "../../common/utils/ApiResponse.js";
import { ApiError } from "../../common/utils/ApiError.js";
import { AuthRequest } from "../../common/middleware/authenticate.middleware.js";
import { createPollSchema, updatePollSchema, pollListQuerySchema } from "./dtos/poll.dto.js";

export class PollController {
  /**
   * POST /api/v1/polls
   * Create a new poll. Requires authentication.
   */
  static async create(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) throw ApiError.unauthorized("Authentication required");

    const data = createPollSchema.parse(req.body);
    const poll = await PollService.createPoll(data, userId);

    ApiResponse.created(res, "Poll created successfully", poll);
  }

  /**
   * GET /api/v1/polls/my
   * Get all polls created by the authenticated user, with pagination.
   */
  static async getMyPolls(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) throw ApiError.unauthorized("Authentication required");

    const query = pollListQuerySchema.parse(req.query);
    const result = await PollService.getMyPolls(userId, query);

    ApiResponse.paginated(res, "Polls retrieved successfully", result.polls, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  }

  /**
   * GET /api/v1/polls/:pollId
   * Get a single poll by ID.
   * Public route — optionalAuth middleware attaches user if logged in.
   */
  static async getById(req: AuthRequest, res: Response): Promise<void> {
    const pollId = req.params["pollId"] as string;
    if (!pollId) throw ApiError.badRequest("Poll ID is required");

    const poll = await PollService.getPollById(pollId, req.user?.userId);

    ApiResponse.ok(res, "Poll retrieved successfully", poll);
  }

  /**
   * PATCH /api/v1/polls/:pollId
   * Update mutable poll fields. Requires authentication + ownership.
   */
  static async update(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) throw ApiError.unauthorized("Authentication required");

    const pollId = req.params["pollId"] as string;
    if (!pollId) throw ApiError.badRequest("Poll ID is required");

    const data = updatePollSchema.parse(req.body);
    const updated = await PollService.updatePoll(pollId, data, userId);

    ApiResponse.ok(res, "Poll updated successfully", updated);
  }

  /**
   * DELETE /api/v1/polls/:pollId
   * Delete a poll. Requires authentication + ownership.
   */
  static async deletePoll(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) throw ApiError.unauthorized("Authentication required");

    const pollId = req.params["pollId"] as string;
    if (!pollId) throw ApiError.badRequest("Poll ID is required");

    await PollService.deletePoll(pollId, userId);

    ApiResponse.ok(res, "Poll deleted successfully");
  }

  /**
   * POST /api/v1/polls/:pollId/duplicate
   * Duplicate a poll — creates a new active copy with same questions/settings.
   * Requires authentication + ownership. Response data is not copied.
   */
  static async duplicate(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) throw ApiError.unauthorized("Authentication required");

    const pollId = req.params["pollId"] as string;
    if (!pollId) throw ApiError.badRequest("Poll ID is required");

    const duplicated = await PollService.duplicatePoll(pollId, userId);

    ApiResponse.created(res, "Poll duplicated successfully", duplicated);
  }

  /**
   * POST /api/v1/polls/:pollId/close
   * Close a poll early — stops accepting responses. Requires authentication + ownership.
   * After closing, the creator can publish results.
   */
  static async close(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) throw ApiError.unauthorized("Authentication required");

    const pollId = req.params["pollId"] as string;
    if (!pollId) throw ApiError.badRequest("Poll ID is required");

    const closed = await PollService.closePoll(pollId, userId);

    ApiResponse.ok(res, "Poll closed successfully", closed);
  }

  /**
   * POST /api/v1/polls/:pollId/publish
   * Publish a poll's final results. Requires authentication + ownership.
   * After publishing, the poll link shows results to everyone.
   */
  static async publish(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) throw ApiError.unauthorized("Authentication required");

    const pollId = req.params["pollId"] as string;
    if (!pollId) throw ApiError.badRequest("Poll ID is required");

    const published = await PollService.publishPoll(pollId, userId);

    ApiResponse.ok(res, "Poll results published successfully", published);
  }
}
