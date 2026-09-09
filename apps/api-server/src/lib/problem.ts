export interface ProblemDetails {
  type?: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
}

export function createProblem(
  status: number,
  code: string,
  message: string,
  instance?: string
): ProblemDetails {
  return {
    type: `/problems/${code.toLowerCase()}`,
    title: code,
    status,
    detail: message,
    instance,
  };
}

export const INTERNAL_PROBLEM = createProblem(
  500,
  "INTERNAL_ERROR",
  "An internal server error occurred"
);

export const NOT_FOUND_PROBLEM = createProblem(
  404,
  "NOT_FOUND",
  "Resource not found"
);

export const UNAUTHORIZED_PROBLEM = createProblem(
  401,
  "UNAUTHORIZED",
  "Authentication required"
);

export const FORBIDDEN_PROBLEM = createProblem(
  403,
  "FORBIDDEN",
  "Access denied"
);

export const BAD_REQUEST_PROBLEM = createProblem(
  400,
  "BAD_REQUEST",
  "Invalid request"
);

export const CONFLICT_PROBLEM = createProblem(
  409,
  "CONFLICT",
  "Resource conflict"
);
