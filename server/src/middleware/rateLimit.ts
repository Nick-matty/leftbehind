import rateLimit from 'express-rate-limit';

const json = { error: 'Too many requests. Please slow down and try again.', code: 'rate_limited' };

// Global limiter: generous, protects against blunt abuse/scraping.
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: json,
});

// Strict limiter for auth endpoints: blunts credential stuffing / brute force.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: json,
});

// Sync can be chatty (offline catch-up), so allow more but still bounded.
export const syncLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: json,
});
