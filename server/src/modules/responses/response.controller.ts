import crypto from "node:crypto";
import { Response as ExpressResponse } from "express";
import { ResponseService } from "./response.service.js";
import { ApiResponse } from "../../common/utils/ApiResponse.js";
import { ApiError } from "../../common/utils/ApiError.js";
import { AuthRequest } from "../../common/middleware/authenticate.middleware.js";
import { submitResponseSchema } from "./dtos/response.dto.js";

export class ResponseController {
  /**
   * POST /api/v1/polls/:pollId/respond
   *
   * The optionalAuth middleware runs before this.
   * req.user is set if a valid Bearer token was present — undefined otherwise.
   *
   * This single endpoint handles both:
   * - Authenticated users   (req.user is set, duplicate check applies)
   * - Anonymous guests      (req.user is undefined, IP stored for rate limiting)
   */
  static async submit(req: AuthRequest, res: ExpressResponse): Promise<void> {
    const pollId = req.params["pollId"] as string;
    if (!pollId) throw ApiError.badRequest("Poll ID is required");

    const { answers } = submitResponseSchema.parse(req.body);

    // Extract the real IP address — req.ip respects the trust proxy setting
    // we configured in index.ts for production (nginx passes X-Forwarded-For)
    const ipAddress = req.ip ?? undefined;

    // SHA-256 hash the IP for anonymous duplicate prevention.
    // One-way hash means we can detect repeat submissions without storing
    // raw IPs in an indexed field — privacy-preserving dedup.
    const ipHash =
      ipAddress !== undefined && req.user?.userId === undefined
        ? crypto.createHash("sha256").update(ipAddress).digest("hex")
        : undefined;

    const result = await ResponseService.submitResponse({
      pollId,
      answers,
      ...(req.user?.userId !== undefined && { userId: req.user.userId }),
      ...(ipAddress !== undefined && { ipAddress }),
      ...(ipHash !== undefined && { ipHash }),
    });

    ApiResponse.created(res, result.message, { responseId: result.responseId });
  }
}
