import { Request, Response, NextFunction } from 'express';

const rateLimits = new Map<string, { count: number; resetTime: number }>();

/**
 * A highly performant, server-side, in-memory sliding-window rate limiting middleware.
 * Prevents rapid automated spam attacks by tracking requests from unique client IPs.
 * 
 * @param limit Maximum number of requests allowed within the window.
 * @param windowMs Time window in milliseconds.
 */
export const rateLimitMiddleware = (limit: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const rawIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    // Resolve the first IP index in case of proxy chains (e.g., Cloud Run)
    const ip = rawIp.split(',')[0].trim();
    const clientKey = `${req.baseUrl || ''}${req.path}_${ip}`;
    const now = Date.now();
    const entry = rateLimits.get(clientKey);

    if (!entry || now > entry.resetTime) {
      rateLimits.set(clientKey, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (entry.count >= limit) {
      console.warn(`[RateLimit] Blocked excessive requests from IP: ${ip} targeting endpoint: ${req.baseUrl || ''}${req.path}`);
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please slow down and try again later."
      });
    }

    entry.count++;
    return next();
  };
};
