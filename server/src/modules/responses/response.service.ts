import { IPoll } from "../polls/poll.schema.js";
import { PollService } from "../polls/poll.service.js";
import { PollRepository } from "../polls/poll.repository.js";
import { ResponseRepository } from "./response.repository.js";
import { AnalyticsService } from "../analytics/analytics.service.js";
import { ApiError } from "../../common/utils/ApiError.js";
import { emitResponseCount, emitAnalyticsUpdate } from "../../socket/socket.js";
import { SubmitResponseInput } from "./dtos/response.dto.js";

export class ResponseService {
  /**
   * Submit a response to a poll.
   *
   * This is the most logic-heavy method in the entire codebase.
   * It enforces every constraint the spec requires, in order:
   *
   * 1. Poll must be active and not expired (delegates to PollService)
   * 2. Auth requirement: if poll.requiresAuth and no userId → reject
   * 3. Duplicate prevention: if authenticated, check prior response
   * 4. Structural validation: submitted questionIds must exist in poll
   * 5. Mandatory question validation: all required questions must be answered
   * 6. Option validation: each optionId must belong to its question
   * 7. Save response
   * 8. Increment poll.totalResponses atomically
   * 9. Emit real-time socket events (count + analytics snapshot)
   */
  static async submitResponse(params: {
    pollId: string;
    answers: SubmitResponseInput["answers"];
    userId?: string; // undefined = anonymous / unauthenticated
    ipAddress?: string;
    ipHash?: string; // SHA-256 of IP for anonymous duplicate prevention
  }): Promise<{ message: string; responseId: string }> {
    const { pollId, answers, userId, ipAddress, ipHash } = params;

    // ── Step 1: Poll must accept responses ───────────────────────────────────
    const poll = await PollService.assertPollAcceptsResponses(pollId);

    // ── Step 2: Auth requirement check ───────────────────────────────────────
    // If the poll creator set requiresAuth: true, anonymous guests are rejected.
    // This check happens BEFORE duplicate detection so error messages don't
    // leak information about whether anonymous users have responded.
    if (poll.requiresAuth && !userId) {
      throw ApiError.unauthorized("This poll requires you to be logged in to submit a response");
    }

    // ── Step 3: Duplicate response prevention ────────────────────────────────
    // Dual-layer approach matching the cheatsheet's recommended pattern:
    // Layer 1 (app): check before save — returns clear error messages
    // Layer 2 (DB): unique sparse indexes — safety net if app logic fails
    //
    // Authenticated: unique sparse index on (pollId, respondentId)
    // Anonymous:     unique sparse index on (pollId, ipHash)

    if (userId) {
      const alreadyResponded = await ResponseRepository.hasUserResponded(pollId, userId);
      if (alreadyResponded) {
        throw ApiError.conflict("You have already submitted a response to this poll");
      }
    } else if (ipHash) {
      // Anonymous duplicate prevention: check by IP hash
      const alreadyResponded = await ResponseRepository.hasIpResponded(pollId, ipHash);
      if (alreadyResponded) {
        throw ApiError.conflict("A response has already been submitted from this device");
      }
    }

    // ── Steps 4, 5, 6: Validate answers against poll structure ───────────────
    ResponseService.validateAnswers(poll, answers);

    // ── Step 7: Save response ────────────────────────────────────────────────
    const saved = await ResponseRepository.create({
      pollId,
      answers,
      isAnonymous: poll.isAnonymous,
      ...(userId !== undefined && { respondentId: userId }),
      ...(ipAddress !== undefined && { ipAddress }),
      ...(ipHash !== undefined && { ipHash }),
    });

    // ── Step 8: Increment denormalised counter atomically ────────────────────
    const totalResponses = await PollRepository.incrementResponseCount(pollId);

    // ── Step 9: Real-time socket emissions ───────────────────────────────────
    // Emit count immediately — cheap, always happens
    emitResponseCount(pollId, totalResponses);

    // Emit analytics snapshot — slightly more expensive (aggregation), but
    // runs async so it doesn't block the HTTP response to the respondent.
    // We use void intentionally — a failed analytics emit is non-critical.
    void ResponseService.emitAnalyticsSnapshot(pollId);

    return {
      message: "Response submitted successfully. Thank you for your feedback!",
      responseId: saved._id.toString(),
    };
  }

  /**
   * Validate submitted answers against the poll's question structure.
   *
   * Three levels of validation:
   * 1. Every submitted questionId must exist in the poll
   * 2. Every required question must have an answer
   * 3. Every submitted optionId must belong to the correct question
   *
   * This runs entirely in memory — no extra DB queries.
   * The poll document (with embedded questions/options) is already loaded.
   */
  private static validateAnswers(poll: IPoll, answers: SubmitResponseInput["answers"]): void {
    // Build lookup maps from the poll's embedded data
    // Map<questionId, Set<optionId>>
    const questionOptionMap = new Map<string, Set<string>>();
    const requiredQuestionIds = new Set<string>();

    for (const question of poll.questions) {
      const qId = question._id.toString();
      const optionIds = new Set(question.options.map((o) => o._id.toString()));
      questionOptionMap.set(qId, optionIds);
      if (question.isRequired) {
        requiredQuestionIds.add(qId);
      }
    }

    // Map of submitted answers: questionId → optionId
    const submittedMap = new Map<string, string>();

    for (const answer of answers) {
      const { questionId, optionId } = answer;

      // Validation 1: questionId must exist in this poll
      if (!questionOptionMap.has(questionId)) {
        throw ApiError.badRequest(`Question "${questionId}" does not belong to this poll`);
      }

      // Validation 3: optionId must belong to this question
      const validOptions = questionOptionMap.get(questionId)!;
      if (!validOptions.has(optionId)) {
        throw ApiError.badRequest(
          `Option "${optionId}" is not a valid choice for question "${questionId}"`,
        );
      }

      // Detect duplicate answers for the same question
      if (submittedMap.has(questionId)) {
        throw ApiError.badRequest(
          `Duplicate answer submitted for question "${questionId}". Each question allows only one answer.`,
        );
      }

      submittedMap.set(questionId, optionId);
    }

    // Validation 2: all required questions must have been answered
    const missingRequired: string[] = [];
    for (const requiredId of requiredQuestionIds) {
      if (!submittedMap.has(requiredId)) {
        // Find the question text for a human-readable error
        const question = poll.questions.find((q) => q._id.toString() === requiredId);
        missingRequired.push(question?.text ?? requiredId);
      }
    }

    if (missingRequired.length > 0) {
      throw ApiError.unprocessable(
        `The following required questions were not answered: ${missingRequired.join(", ")}`,
      );
    }
  }

  /**
   * Compute and emit the current analytics snapshot via Socket.io.
   * Called async after a response is saved — failure is non-critical.
   */
  private static async emitAnalyticsSnapshot(pollId: string): Promise<void> {
    try {
      const snapshot = await AnalyticsService.getAnalyticsSnapshot(pollId);
      emitAnalyticsUpdate(pollId, snapshot);
    } catch (err) {
      // Log but never crash — a failed socket emit must not affect response submission
      console.error("[ResponseService] Failed to emit analytics snapshot:", err);
    }
  }
}
