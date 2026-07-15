/**
 * Middleware — validate route `:id` params.
 *
 * Every REST endpoint that reads `req.params.id` and hands it to
 * storage should be preceded by this middleware. It rejects anything
 * that doesn't match the ID pattern (alphanum + dash + underscore,
 * 1-64 chars) before the request reaches the handler, so:
 *
 *  - SQL injection payloads never reach Drizzle even if a future
 *    handler mistakenly interpolates instead of parameterising.
 *  - Path-traversal fragments (`../`, `%2e%2e`, etc.) never reach
 *    downstream cache keys, log lines, or Firestore doc paths.
 *  - Excessively long ids can't be used to blow up log lines.
 */
import type { Request, Response, NextFunction } from "express";

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function validateIdParam(paramName = "id") {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.params[paramName];
    if (typeof value !== "string" || !ID_PATTERN.test(value)) {
      res.status(400).json({ message: `invalid ${paramName}` });
      return;
    }
    next();
  };
}
