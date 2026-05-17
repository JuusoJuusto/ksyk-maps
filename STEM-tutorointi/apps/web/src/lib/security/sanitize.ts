// ============================================
// STEM Genius - Input Sanitization
// XSS protection and input cleaning
// ============================================

/**
 * Sanitize HTML to prevent XSS attacks
 */
export function sanitizeHTML(html: string): string {
  if (typeof window === 'undefined') {
    // Server-side: basic sanitization
    return html
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // Client-side: use DOMParser
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

/**
 * Sanitize user input (remove dangerous characters)
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .slice(0, 10000); // Limit length
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  return email
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9@._+-]/g, '');
}

/**
 * Sanitize URL to prevent XSS
 */
export function sanitizeURL(url: string): string {
  try {
    const parsed = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    
    return parsed.toString();
  } catch {
    return '';
  }
}

/**
 * Escape special characters for SQL (additional layer, Prisma handles this)
 */
export function escapeSQLString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x00/g, '\\0')
    .replace(/\x1a/g, '\\Z');
}

/**
 * Validate and sanitize JSON input
 */
export function sanitizeJSON(input: string): any {
  try {
    const parsed = JSON.parse(input);
    
    // Recursively sanitize strings in the object
    const sanitize = (obj: any): any => {
      if (typeof obj === 'string') {
        return sanitizeInput(obj);
      }
      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }
      if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const key in obj) {
          sanitized[sanitizeInput(key)] = sanitize(obj[key]);
        }
        return sanitized;
      }
      return obj;
    };
    
    return sanitize(parsed);
  } catch {
    return null;
  }
}

/**
 * Remove null bytes and control characters
 */
export function removeControlCharacters(str: string): string {
  return str.replace(/[\x00-\x1F\x7F]/g, '');
}

/**
 * Sanitize filename to prevent directory traversal
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .slice(0, 255);
}

/**
 * Validate and sanitize phone number
 */
export function sanitizePhone(phone: string): string {
  return phone.replace(/[^0-9+()-\s]/g, '').slice(0, 20);
}

/**
 * Check if string contains potential XSS
 */
export function containsXSS(str: string): boolean {
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /eval\(/i,
    /expression\(/i,
  ];
  
  return xssPatterns.some(pattern => pattern.test(str));
}

/**
 * Check if string contains SQL injection patterns
 */
export function containsSQLInjection(str: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(UNION\s+SELECT)/i,
    /(OR\s+1\s*=\s*1)/i,
    /(AND\s+1\s*=\s*1)/i,
    /('|"|;|--|\*|\/\*|\*\/)/,
  ];
  
  return sqlPatterns.some(pattern => pattern.test(str));
}

/**
 * Sanitize markdown to prevent XSS while preserving formatting
 */
export function sanitizeMarkdown(markdown: string): string {
  return markdown
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');
}
