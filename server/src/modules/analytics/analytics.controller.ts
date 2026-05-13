import { Response } from "express";
import { AnalyticsService } from "./analytics.service.js";
import { ApiResponse } from "../../common/utils/ApiResponse.js";
import { ApiError } from "../../common/utils/ApiError.js";
import { AuthRequest } from "../../common/middleware/authenticate.middleware.js";

export class AnalyticsController {
  /**
   * GET /api/v1/analytics/:pollId
   *
   * Full analytics dashboard — requires auth + must be poll creator.
   * Returns: total responses, per-option counts, percentages,
   * daily timeline, anonymous vs identified breakdown.
   */
  static async getAnalytics(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) throw ApiError.unauthorized("Authentication required");

    const pollId = req.params["pollId"] as string;
    if (!pollId) throw ApiError.badRequest("Poll ID is required");

    const analytics = await AnalyticsService.getFullAnalytics(pollId, userId);
    ApiResponse.ok(res, "Analytics retrieved successfully", analytics);
  }

  /**
   * GET /api/v1/analytics/:pollId/results
   *
   * Public published results — no auth required.
   * Only works if the creator has published the poll.
   * This is the endpoint the public poll link uses after publishing.
   */
  static async getPublishedResults(req: AuthRequest, res: Response): Promise<void> {
    const pollId = req.params["pollId"] as string;
    if (!pollId) throw ApiError.badRequest("Poll ID is required");

    const results = await AnalyticsService.getPublishedResults(pollId);
    ApiResponse.ok(res, "Published results retrieved successfully", results);
  }
}