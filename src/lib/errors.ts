/**
 * Unified error handling for API
 */

export class APIError extends Error {
  public statusCode: number;

  constructor(
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'APIError';

    // Map error codes to HTTP status codes
    switch (code) {
      case 'NOT_FOUND':
        this.statusCode = 404;
        break;
      case 'CONFLICT':
      case 'INVALID_ROLE':
      case 'INVALID_DATE':
        this.statusCode = 409;
        break;
      case 'UNAUTHORIZED':
        this.statusCode = 401;
        break;
      case 'FORBIDDEN':
        this.statusCode = 403;
        break;
      case 'VALIDATION_ERROR':
        this.statusCode = 422;
        break;
      case 'INTERNAL_ERROR':
      default:
        this.statusCode = 500;
    }
  }
}

export interface ApiErrorResponse {
  request_id: string;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiSuccessResponse<T> {
  request_id: string;
  data: T;
}
