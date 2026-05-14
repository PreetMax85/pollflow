import { Types } from "mongoose";
import { Poll, IPoll } from "./poll.schema.js";
import { CreatePollInput, UpdatePollInput, PollListQuery } from "./dtos/poll.dto.js";

/**
 * PollRepository — all Mongoose operations for polls.
 * Zero business logic. Zero ApiErrors. Only DB calls and data shaping.
 * If the DB layer changes, only this file needs updating.
 */
export class PollRepository {
  /**
   * Create a new poll.
   * Assigns order values to questions and options at creation time so the
   * client always receives them in a predictable, stable order.
   */
  static async create(data: CreatePollInput, createdBy: string): Promise<IPoll> {
    const poll = await Poll.create({
      title: data.title,
      ...(data.description !== undefined && { description: data.description }),
      createdBy: new Types.ObjectId(createdBy),
      requiresAuth: data.requiresAuth,
      isAnonymous: data.isAnonymous,
      expiresAt: data.expiresAt,
      questions: data.questions.map((q, qIndex) => ({
        text: q.text,
        isRequired: q.isRequired,
        order: qIndex,
        options: q.options.map((o, oIndex) => ({
          text: o.text,
          order: oIndex,
        })),
      })),
    });
    return poll;
  }

  /**
   * Get a single poll by ID — no auth check here, that's the service's job.
   */
  static async findById(pollId: string): Promise<IPoll | null> {
    if (!Types.ObjectId.isValid(pollId)) return null;
    return Poll.findById(pollId).lean({ virtuals: true });
  }

  /**
   * Get all polls created by a specific user, paginated.
   * Returns a page of polls + total count for pagination metadata.
   */
  static async findByCreator(
    userId: string,
    query: PollListQuery,
  ): Promise<{ polls: IPoll[]; total: number }> {
    const filter: Record<string, unknown> = {
      createdBy: new Types.ObjectId(userId),
    };

    if (query.status) {
      filter["status"] = query.status;
    }

    const skip = (query.page - 1) * query.limit;

    const [polls, total] = await Promise.all([
      Poll.find(filter)
        .sort({ createdAt: -1 }) // newest first
        .skip(skip)
        .limit(query.limit)
        .lean({ virtuals: true }),
      Poll.countDocuments(filter),
    ]);

    return { polls, total };
  }

  /**
   * Update mutable poll fields.
   * Returns the updated document or null if not found.
   */
  static async update(pollId: string, data: UpdatePollInput): Promise<IPoll | null> {
    if (!Types.ObjectId.isValid(pollId)) return null;
    return Poll.findByIdAndUpdate(pollId, { $set: data }, { returnDocument: "after", runValidators: true }).lean({
      virtuals: true,
    });
  }

  /**
   * Delete a poll by ID. This is a hard delete.
   * The service layer handles cascading deletion of associated responses
   * before calling this — see PollService.deletePoll().
   */
  static async delete(pollId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(pollId)) return false;
    const result = await Poll.findByIdAndDelete(pollId);
    return result !== null;
  }

  /**
   * Close a poll early — sets status to expired.
   * Used when the creator manually closes a poll before its natural expiry.
   */
  static async close(pollId: string): Promise<IPoll | null> {
    if (!Types.ObjectId.isValid(pollId)) return null;
    return Poll.findByIdAndUpdate(
      pollId,
      { $set: { status: "expired" } },
      { returnDocument: "after" },
    ).lean({ virtuals: true });
  }

  /**
   * Mark a poll as published and record the timestamp.
   * Published polls show final results to anyone visiting the link.
   */
  static async publish(pollId: string): Promise<IPoll | null> {
    if (!Types.ObjectId.isValid(pollId)) return null;
    return Poll.findByIdAndUpdate(
      pollId,
      {
        $set: {
          status: "published",
          publishedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    ).lean({ virtuals: true });
  }

  /**
   * Atomically increment the denormalised response counter.
   * Called by ResponseService after a successful response submission.
   * Returns the updated totalResponses count.
   */
  static async incrementResponseCount(pollId: string): Promise<number> {
    const updated = await Poll.findByIdAndUpdate(
      pollId,
      { $inc: { totalResponses: 1 } },
      { returnDocument: "after", select: "totalResponses" },
    ).lean();
    return (updated as { totalResponses: number } | null)?.totalResponses ?? 0;
  }

  /**
   * Expire all active polls whose expiresAt has passed.
   * Called on a schedule (or lazily) to keep statuses accurate.
   * Returns the number of polls that were expired.
   */
  static async expireOverduePolls(): Promise<number> {
    const result = await Poll.updateMany(
      { status: "active", expiresAt: { $lte: new Date() } },
      { $set: { status: "expired" } },
    );
    return result.modifiedCount;
  }
}
