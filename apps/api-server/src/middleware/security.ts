// =============================================================================
// StreamOps - Security Middleware
// Production security hardening layer
// =============================================================================

import { type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Helmet configuration for security headers
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  referrerPolicy: { policy: 'no-referrer-when-downgrade' },
  xssFilter: true,
});

// Rate limiting configuration
export const rateLimitMiddleware = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes default
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'), // 1000 requests per window
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Only skip rate limiting for health checks
    // SECURITY: Never skip rate limiting based on environment
    return req.path === '/healthz' || req.path === '/health';
  },
});

// Stricter rate limiting for authentication endpoints
export const authRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 minutes
  message: {
    error: 'Too many login attempts, please try again later.',
  },
  skipFailedRequests: false,
  skip: (req: Request) => {
    // SECURITY: Never skip auth rate limiting based on environment
    // Only skip for health checks
    return req.path === '/healthz' || req.path === '/health';
  },
});

// Request size limit middleware
export const requestSizeLimit = (req: Request, res: Response, next: NextFunction): void => {
  const maxSize = parseInt(process.env.MAX_FILE_SIZE || '52428800'); // 50MB default
  
  // Check Content-Length header
  const contentLength = req.headers['content-length'];
  if (contentLength && parseInt(contentLength) > maxSize) {
    res.status(413).json({
      error: 'Request entity too large',
      maxSize: `${maxSize / 1024 / 1024}MB`,
    });
    return;
  }
  
  next();
};

// CORS configuration
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [];
    const isDev = process.env.NODE_ENV !== 'production';
    
    // SECURITY: Reject wildcard configuration in production
    if (!isDev && allowedOrigins.includes('*')) {
      console.error(
        'SECURITY ERROR: CORS_ORIGINS contains wildcard "*". This is not allowed in production. Please specify exact origins.'
      );
      return callback(new Error('Wildcard CORS origin not allowed in production'), false);
    }
    
    // In development, allow localhost and common dev ports
    if (isDev) {
      if (!origin) {
        // Allow requests with no origin (like curl, mobile apps)
        return callback(null, true);
      }
      
      // Allow localhost on any port
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:') ||
          origin.startsWith('http://192.168.') || origin.startsWith('http://172.')) {
        return callback(null, true);
      }
      
      // Allow explicitly configured origins
      if (allowedOrigins.includes('*') || allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      }
      
      console.warn(`CORS blocked origin in development: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    }
    
    // In production, require explicit origin configuration
    if (allowedOrigins.length === 0) {
      console.error(
        'SECURITY ERROR: CORS_ORIGINS is not configured for production. Please set allowed origins in environment variables.'
      );
      return callback(new Error('CORS origins not configured'), false);
    }
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Additional custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  next();
};

// IP whitelist middleware (optional)
export const ipWhitelistMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const allowedIPs = process.env.ALLOWED_IPS?.split(',') || [];
  
  if (allowedIPs.length === 0) {
    return next(); // No IP restriction configured
  }
  
  const clientIP = req.ip || req.socket.remoteAddress || '';
  
  if (allowedIPs.includes(clientIP)) {
    next();
  } else {
    res.status(403).json({
      error: 'Access denied from this IP address',
    });
  }
};
