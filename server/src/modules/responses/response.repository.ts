import { Types } from "mongoose";
import { Response, IResponse } from "./response.schema.js";
import { SubmitResponseInput } from "./dtos/response.dto.js";

export class ResponseRepository {
  /**
   * Save a new response to the database.
   * respondentId and ipAddress are optional — absent for anonymous guests.
   */
  static async create(params: {
    pollId: string;
    answers: SubmitResponseInput["answers"];
    isAnonymous: boolean;
    respondentId?: string;
    ipAddress?: string;
    ipHash?: string;
  }): Promise<IResponse> {
    const doc: Record<string, unknown> = {
      pollId: new Types.ObjectId(params.pollId),
      answers: params.answers.map((a) => ({
        questionId: new Types.ObjectId(a.questionId),
        optionId: new Types.ObjectId(a.optionId),
      })),
      isAnonymous: params.isAnonymous,
    };

    if (params.respondentId !== undefined) {
      doc["respondentId"] = new Types.ObjectId(params.respondentId);
    }

    if (params.ipAddress !== undefined) {
      doc["ipAddress"] = params.ipAddress;
    }

    if (params.ipHash !== undefined) {
      doc["ipHash"] = params.ipHash;
    }

    return Response.create(doc);
  }

  /**
   * Check if an authenticated user has already responded to a poll.
   * Uses the sparse unique index — O(1) lookup.
   */
  static async hasUserResponded(
    pollId: string,
    userId: string,
  ): Promise<boolean> {
    const exists = await Response.exists({
      pollId: new Types.ObjectId(pollId),
      respondentId: new Types.ObjectId(userId),
    });
    return exists !== null;
  }

  /**
   * Check if an IP address has already been used to respond to a poll.
   * Layer 1 of anonymous duplicate prevention (app-level check).
   * Layer 2 is the unique sparse index on (pollId, ipHash).
   */
  static async hasIpResponded(
    pollId: string,
    ipHash: string,
  ): Promise<boolean> {
    const exists = await Response.exists({
      pollId: new Types.ObjectId(pollId),
      ipHash,
    });
    return exists !== null;
  }

  /**
   * Count total responses for a poll.
   * Used as a fast check — prefer poll.totalResponses for display (denormalised).
   * This is the source of truth when accuracy matters (e.g. before publishing).
   */
  static async countByPoll(pollId: string): Promise<number> {
    return Response.countDocuments({ pollId: new Types.ObjectId(pollId) });
  }

  /**
   * Delete all responses for a poll.
   * Called when the poll creator deletes their poll.
   */
  static async deleteByPollId(pollId: string): Promise<void> {
    await Response.deleteMany({ pollId: new Types.ObjectId(pollId) });
  }

  /**
   * Get all responses for a poll — used by analytics aggregation pipeline.
   * Returns lean documents for performance (no Mongoose document overhead).
   */
  static async findByPollId(pollId: string): Promise<IResponse[]> {
    return Response.find({ pollId: new Types.ObjectId(pollId) })
      .lean({ virtuals: true });
  }
}