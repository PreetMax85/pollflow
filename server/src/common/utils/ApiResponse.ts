import { Response } from "express";
import { HttpStatus } from "../constants/http-status.js";

export class ApiResponse {
  static ok<T>(res: Response, message: string, data: T | null = null): Response {
    return res.status(HttpStatus.OK).json({
      success: true,
      message,
      data,
    });
  }

  static created<T>(res: Response, message: string, data: T | null = null): Response {
    return res.status(HttpStatus.CREATED).json({
      success: true,
      message,
      data,
    });
  }

  // Added for routes that return paginated lists (like poll lists)
  static paginated<T>(
    res: Response,
    message: string,
    data: T,
    meta: {
      page: number;
      limit: number;
      total: number;
    },
  ): Response {
    return res.status(HttpStatus.OK).json({
      success: true,
      message,
      data,
      meta: {
        ...meta,
        totalPages: Math.ceil(meta.total / meta.limit),
        hasNextPage: meta.page * meta.limit < meta.total,
      },
    });
  }

  static noContent(res: Response) {
    return res.status(HttpStatus.NO_CONTENT).send();
  }
}
