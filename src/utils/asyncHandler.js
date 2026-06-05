/**
 * Wraps an async route handler, forwarding any thrown error to Express's next().
 * Eliminates try/catch boilerplate in every controller.
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
