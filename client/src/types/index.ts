/**
 * @file src/types/index.ts
 * Shared TypeScript interfaces mirroring the backend's response shapes.
 * All shapes derived directly from poll.schema.ts + route responses.
 */

// ─── API Envelope ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponseData {
  user: AuthUser;
  accessToken: string;
}

// ─── Poll ─────────────────────────────────────────────────────────────────────
// Matches IOption / IQuestion / IPoll from poll.schema.ts.
// Note: toJSON transform maps _id → id, so frontend always uses `id`.

export type PollStatus = "active" | "expired" | "published";

export interface PollOption {
  _id: string;
  text: string;
  order: number;
}

export interface PollQuestion {
  _id: string;
  text: string;
  isRequired: boolean;
  order: number;
  options: PollOption[];
}

export interface Poll {
  id: string; // present when Mongoose toJSON transform runs
  _id?: string; // present when backend uses .lean() — skips toJSON
  title: string;
  description?: string;
  createdBy: string;
  questions: PollQuestion[];
  requiresAuth: boolean;
  isAnonymous: boolean;
  status: PollStatus;
  expiresAt: string; // ISO date string
  publishedAt?: string;
  totalResponses: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Poll Creation / Update ───────────────────────────────────────────────────
// What we send TO the backend.

export interface CreateOptionInput {
  text: string;
}

export interface CreateQuestionInput {
  text: string;
  isRequired: boolean;
  options: CreateOptionInput[];
}

export interface CreatePollInput {
  title: string;
  description?: string;
  questions: CreateQuestionInput[];
  requiresAuth: boolean;
  isAnonymous: boolean;
  expiresAt: string; // ISO date string
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface OptionAnalytics {
  optionId: string;
  optionText: string;
  count: number;
  percentage: number;
}

export interface QuestionAnalytics {
  questionId: string;
  questionText: string;
  isRequired: boolean;
  totalAnswers: number;
  options: OptionAnalytics[];
}

export interface FullAnalytics {
  pollId: string;
  pollTitle: string;
  totalResponses: number;
  questions: QuestionAnalytics[];
  dailyTimeline: { date: string; count: number }[];
  anonymousCount: number;
  identifiedCount: number;
  completionRate: number;
  publishedAt?: string;
  status: PollStatus;
  expiresAt: string;
}

export interface PublishedResults {
  pollId: string;
  pollTitle: string;
  totalResponses: number;
  questions: QuestionAnalytics[];
  dailyTimeline: { date: string; count: number }[];
  publishedAt: string;
}

export type AnalyticsData = PublishedResults;
