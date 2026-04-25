import type { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

/**
 * Security Middleware for KSYK Maps Application
 * Implements comprehensive security measures to prevent common vulnerabilities
 */

// ==================== RATE LIMITING ====================
// Prevent brute force attacks and API abuse

export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: "Too many login attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 requests per minute
  message: "API rate limit exceeded, please slow down.",
  standardHeaders: true,
  legacyHeaders: false,
});

// ==================== SECURITY HEADERS ====================
// Configure Helmet for comprehensive security headers

export const securityHeaders = helmet({
  // Content Security Policy - Prevents XSS attacks
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Vite in development
        "'unsafe-eval'", // Required for Vite in development
        "https://vercel.live",
        "https://va.vercel-scripts.com",
        "https://www.googletagmanager.com",
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for styled components
        "https://fonts.googleapis.com",
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https:",
        "http:",
      ],
      fontSrc: [
        "'self'",
        "data:",
        "https://fonts.gstatic.com",
      ],
      connectSrc: [
        "'self'",
        "https://vercel.live",
        "https://va.vercel-scripts.com",
        "https://*.firebase.googleapis.com",
        "https://*.firebaseio.com",
        "wss://*.firebaseio.com",
      ],
      frameSrc: ["'self'", "https://vercel.live"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  
  // Prevent clickjacking attacks
  frameguard: {
    action: "deny", // Prevents the page from being embedded in iframes
  },
  
  // Force HTTPS
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  
  // Prevent MIME type sniffing
  noSniff: true,
  
  // Disable X-Powered-By header
  hidePoweredBy: true,
  
  // XSS Protection
  xssFilter: true,
  
  // Referrer Policy
  referrerPolicy: {
    policy: "strict-origin-when-cross-origin",
  },
});

// ==================== INPUT VALIDATION ====================
// Sanitize and validate user inputs

export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  // Remove potential XSS vectors
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

export function validateUserId(userId: string): boolean {
  // User IDs should be alphanumeric with hyphens/underscores only
  return /^[a-zA-Z0-9_-]+$/.test(userId);
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ==================== AUTHORIZATION MIDDLEWARE ====================
// Verify user has permission to access resources

export function requireRole(...allowedRoles: string[]) {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ 
          message: "Authentication required",
          code: "AUTH_REQUIRED"
        });
      }

      const userId = req.user.claims.sub;
      
      // Import storage dynamically to avoid circular dependencies
      const { storage } = await import('./storage');
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ 
          message: "User not found",
          code: "USER_NOT_FOUND"
        });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ 
          message: "Insufficient permissions",
          code: "FORBIDDEN",
          required: allowedRoles,
          current: user.role
        });
      }

      // Attach user to request for downstream use
      req.currentUser = user;
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({ 
        message: "Authorization check failed",
        code: "AUTH_ERROR"
      });
    }
  };
}

// ==================== RESOURCE OWNERSHIP VALIDATION ====================
// Prevent IDOR (Insecure Direct Object Reference) attacks

export function validateResourceOwnership(resourceType: 'user' | 'student' | 'grade' | 'attendance') {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ 
          message: "Authentication required",
          code: "AUTH_REQUIRED"
        });
      }

      const userId = req.user.claims.sub;
      const resourceId = req.params.id || req.params.userId || req.params.studentId;

      // Import storage dynamically
      const { storage } = await import('./storage');
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ 
          message: "User not found",
          code: "USER_NOT_FOUND"
        });
      }

      // Admins and owners can access all resources
      if (user.role === 'admin' || user.role === 'owner') {
        req.currentUser = user;
        return next();
      }

      // For other users, verify they own the resource or have permission
      switch (resourceType) {
        case 'user':
          if (userId !== resourceId) {
            return res.status(403).json({ 
              message: "You can only access your own user data",
              code: "FORBIDDEN"
            });
          }
          break;

        case 'student':
          // Teachers can access their students, students can access their own data
          if (user.role === 'teacher') {
            // TODO: Verify teacher teaches this student
            break;
          } else if (user.role === 'student' && userId !== resourceId) {
            return res.status(403).json({ 
              message: "You can only access your own student data",
              code: "FORBIDDEN"
            });
          }
          break;

        case 'grade':
        case 'attendance':
          // Similar logic for grades and attendance
          if (user.role === 'student') {
            // Verify the grade/attendance belongs to this student
            // This requires checking the resource in the database
            // For now, we'll allow it and let the route handler validate
          }
          break;
      }

      req.currentUser = user;
      next();
    } catch (error) {
      console.error('Resource ownership validation error:', error);
      res.status(500).json({ 
        message: "Ownership validation failed",
        code: "VALIDATION_ERROR"
      });
    }
  };
}

// ==================== SQL INJECTION PREVENTION ====================
// Validate and sanitize database queries

export function preventSQLInjection(req: Request, res: Response, next: NextFunction) {
  const suspiciousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(--|;|\/\*|\*\/|xp_|sp_)/gi,
    /(\bOR\b.*=.*|1=1|'=')/gi,
  ];

  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(value));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  // Check query parameters
  if (checkValue(req.query)) {
    return res.status(400).json({ 
      message: "Invalid query parameters detected",
      code: "INVALID_INPUT"
    });
  }

  // Check body
  if (checkValue(req.body)) {
    return res.status(400).json({ 
      message: "Invalid request body detected",
      code: "INVALID_INPUT"
    });
  }

  next();
}

// ==================== CORS CONFIGURATION ====================
// Secure Cross-Origin Resource Sharing

export const corsOptions = {
  origin: (origin: string | undefined, callback: Function) => {
    const allowedOrigins = [
      'http://localhost:5000',
      'http://localhost:3000',
      'https://ksyk-maps.vercel.app',
      'https://ksyk-maps-*.vercel.app', // Preview deployments
    ];

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Check if origin matches allowed patterns
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        const pattern = new RegExp('^' + allowed.replace('*', '.*') + '$');
        return pattern.test(origin);
      }
      return allowed === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// ==================== REQUEST LOGGING ====================
// Log all requests for security auditing

export function securityLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - IP: ${req.ip}`);
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const level = statusCode >= 400 ? 'WARN' : 'INFO';
    
    console.log(
      `[${level}] ${req.method} ${req.path} - ${statusCode} - ${duration}ms`
    );
    
    // Log suspicious activity
    if (statusCode === 401 || statusCode === 403) {
      console.warn(
        `[SECURITY] Unauthorized access attempt: ${req.method} ${req.path} - IP: ${req.ip}`
      );
    }
  });
  
  next();
}

// ==================== PARAMETER POLLUTION PREVENTION ====================
// Prevent HTTP Parameter Pollution attacks

export function preventParameterPollution(req: Request, res: Response, next: NextFunction) {
  // Ensure query parameters are not arrays (unless expected)
  for (const key in req.query) {
    if (Array.isArray(req.query[key])) {
      // Take only the first value
      req.query[key] = (req.query[key] as string[])[0];
    }
  }
  
  next();
}

// ==================== FILE UPLOAD SECURITY ====================
// Validate file uploads

export function validateFileUpload(req: Request, res: Response, next: NextFunction) {
  if (!req.file && !req.files) {
    return next();
  }

  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const file = req.file || (Array.isArray(req.files) ? req.files[0] : null);

  if (file) {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return res.status(400).json({ 
        message: "Invalid file type",
        code: "INVALID_FILE_TYPE",
        allowed: allowedMimeTypes
      });
    }

    if (file.size > maxFileSize) {
      return res.status(400).json({ 
        message: "File too large",
        code: "FILE_TOO_LARGE",
        maxSize: maxFileSize
      });
    }
  }

  next();
}
