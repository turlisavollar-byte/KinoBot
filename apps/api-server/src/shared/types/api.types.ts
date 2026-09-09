export interface ApiResponse<T = unknown> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  code: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T = unknown> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type SortOrder = "asc" | "desc";

export function createPagination(page: number, limit: number): PaginationParams {
  return { page, limit };
}
