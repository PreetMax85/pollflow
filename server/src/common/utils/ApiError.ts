import { HttpStatus } from "../constants/http-status.js";

export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message: string = "Bad request"): ApiError {
    return new ApiError(HttpStatus.BAD_REQUEST, message);
  }

  static unauthorized(message: string = "Unauthorized"): ApiError {
    return new ApiError(HttpStatus.UNAUTHORIZED, message);
  }

  static forbidden(message: string = "Forbidden"): ApiError {
    return new ApiError(HttpStatus.FORBIDDEN, message);
  }

  static notFound(message: string = "Not found"): ApiError {
    return new ApiError(HttpStatus.NOT_FOUND, message);
  }

  static conflict(message: string = "Conflict"): ApiError {
    return new ApiError(HttpStatus.CONFLICT, message);
  }

  static unprocessable(message: string = "Unprocessable entity"): ApiError {
    return new ApiError(HttpStatus.UNPROCESSABLE_ENTITY, message);
  }

  static internal(message: string = "Internal Server Error"): ApiError {
    return new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, message);
  }
}
