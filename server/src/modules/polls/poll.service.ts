import { IPoll } from "./poll.schema.js";
import { PollRepository } from "./poll.repository.js";
import { ResponseRepository } from "../responses/response.repository.js";
import { ApiError } from "../../common/utils/ApiError.js";
import { emitPollPublished, emitPollExpired } from "../../socket/socket.js";
import {
  CreatePollInput,
  UpdatePollInput,
  PollListQuery,
} from "./dtos/poll.dto.js";

/**
 * PollService — all business logic for poll lifecycle management.
 *
 * Rules enforced here:
 * - Only the poll creator can edit, delete, or publish their poll
 * - A poll with responses cannot have its questions modified
 * - An expired poll cannot be published (it must be active or have just closed)
 * - A poll can only be published once
 * - Expiry date must always be in the future when updating
 */
export class PollService {
  /**
   * Create a new poll owned by the authenticated user.
   */
  static async createPoll(
    data: CreatePollInput,
    userId: string,
  ): Promise<IPoll> {
    return PollRepository.create(data, userId);
  }

  /**
   * Get a single poll by ID.
   *
   * Access rules:
   * - Active polls: visible to everyone (creator + respondents)
   * - Expired polls: visible only to the creator
   * - Published polls: visible to everyone (results mode)
   */
  static async getPollById(
    pollId: string,
    requestingUserId?: string,
  ): Promise<IPoll> {
    const poll = await PollRepository.findById(pollId);

    if (!poll) {
      throw ApiError.notFound("Poll not found");
    }

    const isCreator =
      requestingUserId &&
      poll.createdBy.toString() === requestingUserId;

    // Lazy expiry: check if poll is overdue but status hasn't been swept yet
    if (poll.status === "active" && poll.expiresAt <= new Date()) {
      void PollRepository.expireOverduePolls();
      if (!isCreator) {
        throw ApiError.forbidden(
          "This poll has expired and is no longer publicly accessible",
        );
      }
    }

    // Expired polls are private — only the creator can view them for analytics
    if (poll.status === "expired" && !isCreator) {
      throw ApiError.forbidden(
        "This poll has expired and is no longer publicly accessible",
      );
    }

    return poll;
  }

  /**
   * Get all polls created by the authenticated user, paginated.
   */
  static async getMyPolls(
    userId: string,
    query: PollListQuery,
  ): Promise<{ polls: IPoll[]; total: number; page: number; limit: number }> {
    const { polls, total } = await PollRepository.findByCreator(userId, query);
    return { polls, total, page: query.page, limit: query.limit };
  }

  /**
   * Update mutable poll fields.
   *
   * Rules:
   * - Only the creator can update
   * - Active polls only (can't edit expired/published)
   * - Questions are immutable — only title, description, expiresAt can change
   */
  static async updatePoll(
    pollId: string,
    data: UpdatePollInput,
    userId: string,
  ): Promise<IPoll> {
    const poll = await PollRepository.findById(pollId);

    if (!poll) throw ApiError.notFound("Poll not found");

    if (poll.createdBy.toString() !== userId) {
      throw ApiError.forbidden("You do not have permission to edit this poll");
    }

    if (poll.status !== "active") {
      throw ApiError.badRequest(
        `Cannot edit a poll with status "${poll.status}". Only active polls can be edited.`,
      );
    }

    const updated = await PollRepository.update(pollId, data);
    if (!updated) throw ApiError.internal("Failed to update poll");

    return updated;
  }

  /**
   * Delete a poll and all associated data.
   * Only the creator can delete. Deletion cascades to responses via the
   * ResponseRepository (called from here to keep the service responsible
   * for cross-module coordination).
   */
  static async deletePoll(pollId: string, userId: string): Promise<void> {
    const poll = await PollRepository.findById(pollId);

    if (!poll) throw ApiError.notFound("Poll not found");

    if (poll.createdBy.toString() !== userId) {
      throw ApiError.forbidden(
        "You do not have permission to delete this poll",
      );
    }

    // Cascade: delete all associated responses first
    await ResponseRepository.deleteByPollId(pollId);

    const deleted = await PollRepository.delete(pollId);
    if (!deleted) throw ApiError.internal("Failed to delete poll");
  }

  /**
   * Duplicate a poll — creates a new poll with the same questions, options,
   * and settings as the original. The new poll is always active with a 7-day
   * expiry. Response data is NOT copied — only the poll structure.
   */
  static async duplicatePoll(pollId: string, userId: string): Promise<IPoll> {
    const original = await PollRepository.findById(pollId);
    if (!original) throw ApiError.notFound("Poll not found");

    if (original.createdBy.toString() !== userId) {
      throw ApiError.forbidden("You can only duplicate your own polls");
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const duplicateData: CreatePollInput = {
      title: `Copy of ${original.title}`,
      ...(original.description !== undefined && { description: original.description }),
      requiresAuth: original.requiresAuth,
      isAnonymous: original.isAnonymous,
      expiresAt,
      questions: original.questions
        .sort((a, b) => a.order - b.order)
        .map((q) => ({
          text: q.text,
          isRequired: q.isRequired,
          options: [...q.options]
            .sort((a, b) => a.order - b.order)
            .map((o) => ({ text: o.text })),
        })),
    };

    return PollRepository.create(duplicateData, userId);
  }

  /**
   * Close a poll early — transitions active → expired.
   *
   * Only the creator can close. Already expired/published polls are no-ops.
   * After closing, the creator can publish results.
   */
  static async closePoll(pollId: string, userId: string): Promise<IPoll> {
    const poll = await PollRepository.findById(pollId);

    if (!poll) throw ApiError.notFound("Poll not found");

    if (poll.createdBy.toString() !== userId) {
      throw ApiError.forbidden("You do not have permission to close this poll");
    }

    if (poll.status !== "active") {
      throw ApiError.badRequest(
        `Cannot close a poll with status "${poll.status}". Only active polls can be closed.`,
      );
    }

    const closed = await PollRepository.close(pollId);
    if (!closed) throw ApiError.internal("Failed to close poll");

    emitPollExpired(pollId);

    return closed;
  }

  /**
   * Publish a poll's results.
   *
   * Rules:
   * - Only the creator can publish
   * - State machine: only expired polls can be published (active → close → publish)
   * - Must have at least one response to be worth publishing
   * - Cannot publish an already-published poll
   */
  static async publishPoll(pollId: string, userId: string): Promise<IPoll> {
    const poll = await PollRepository.findById(pollId);

    if (!poll) throw ApiError.notFound("Poll not found");

    if (poll.createdBy.toString() !== userId) {
      throw ApiError.forbidden(
        "You do not have permission to publish this poll",
      );
    }

    if (poll.status === "published") {
      throw ApiError.conflict("This poll has already been published");
    }

    if (poll.status !== "expired") {
      throw ApiError.badRequest(
        "Only expired polls can be published. Close the poll first, then publish the results.",
      );
    }

    if (poll.totalResponses === 0) {
      throw ApiError.badRequest(
        "Cannot publish a poll with no responses. Share the poll link and collect responses first.",
      );
    }

    const published = await PollRepository.publish(pollId);
    if (!published) throw ApiError.internal("Failed to publish poll");

    // Notify all clients watching this poll room that results are now public
    emitPollPublished(pollId);

    return published;
  }

  /**
   * Check and expire overdue polls.
   * Called lazily on poll fetch and can be scheduled as a periodic job.
   * Emits socket events for any polls that transition to expired.
   */
  static async expireOverduePolls(): Promise<number> {
    const count = await PollRepository.expireOverduePolls();
    if (count > 0) {
      console.log(`[PollService] Expired ${count} overdue poll(s)`);
    }
    return count;
  }

  /**
   * Middleware-style check: is this poll currently accepting responses?
   * Used by ResponseService before saving a response.
   * Throws a descriptive ApiError if not.
   */
  static async assertPollAcceptsResponses(pollId: string): Promise<IPoll> {
    const poll = await PollRepository.findById(pollId);

    if (!poll) throw ApiError.notFound("Poll not found");

    // Lazy expiry: check at request time in case the cron hasn't run yet
    if (poll.status === "active" && poll.expiresAt <= new Date()) {
      // Trigger async expiry update — don't await, don't block the response
      void PollRepository.expireOverduePolls();
      emitPollExpired(pollId);
      throw ApiError.badRequest(
        "This poll has expired and is no longer accepting responses",
      );
    }

    if (poll.status === "expired") {
      throw ApiError.badRequest(
        "This poll has expired and is no longer accepting responses",
      );
    }

    if (poll.status === "published") {
      throw ApiError.badRequest(
        "This poll has been closed and results have been published",
      );
    }

    return poll;
  }
}