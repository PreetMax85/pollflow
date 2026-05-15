import crypto from "node:crypto";
import { Response as ExpressResponse } from "express";
import { ResponseService } from "./response.service.js";
import { ApiResponse } from "../../common/utils/ApiResponse.js";
import { ApiError } from "../../common/utils/ApiError.js";
import { AuthRequest } from "../../common/middleware/authenticate.middleware.js";
import { submitResponseSchema } from "./dtos/response.dto.js";

export class ResponseController {

  static async submit(req: AuthRequest, res: ExpressResponse): Promise<void> {
    const pollId = req.params["pollId"] as string;
    if (!pollId) throw ApiError.badRequest("Poll ID is required");

    const { answers } = submitResponseSchema.parse(req.body);

    // Extract the real IP address
    const ipAddress = req.ip ?? undefined;

    // SHA-256 hash the IP for anonymous duplicate prevention.
    // One-way hash means we can detect repeat submissions without storing
    // raw IPs in an indexed field
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
