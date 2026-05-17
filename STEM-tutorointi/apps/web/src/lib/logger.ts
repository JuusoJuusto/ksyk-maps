// ============================================
// STEM Genius - Structured Logging
// Production-ready logging system
// ============================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  error?: Error;
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    const formatted = this.formatMessage(level, message, context);

    // In development, use console with colors
    if (this.isDevelopment) {
      const colors = {
        debug: '\x1b[36m', // Cyan
        info: '\x1b[32m',  // Green
        warn: '\x1b[33m',  // Yellow
        error: '\x1b[31m', // Red
      };
      const reset = '\x1b[0m';
      console.log(`${colors[level]}${formatted}${reset}`);
    }

    // In production, use structured JSON logging
    if (this.isProduction) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...context,
      };
      console.log(JSON.stringify(logEntry));
    }

    // Send to external logging service (e.g., Sentry, LogRocket)
    if (this.isProduction && level === 'error' && context?.error) {
      // TODO: Send to error tracking service
      // Sentry.captureException(context.error, { extra: context });
    }
  }

  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      this.log('debug', message, context);
    }
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context);
  }

  // Specialized logging methods
  apiRequest(method: string, endpoint: string, context?: LogContext) {
    this.info(`API Request: ${method} ${endpoint}`, {
      method,
      endpoint,
      ...context,
    });
  }

  apiResponse(method: string, endpoint: string, statusCode: number, duration: number, context?: LogContext) {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    this.log(level, `API Response: ${method} ${endpoint} ${statusCode} (${duration}ms)`, {
      method,
      endpoint,
      statusCode,
      duration,
      ...context,
    });
  }

  authEvent(event: string, userId?: string, context?: LogContext) {
    this.info(`Auth Event: ${event}`, {
      event,
      userId,
      ...context,
    });
  }

  securityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: LogContext) {
    const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    this.log(level, `Security Event: ${event} [${severity}]`, {
      event,
      severity,
      ...context,
    });
  }

  aiEvent(event: string, model: string, tokens?: number, context?: LogContext) {
    this.info(`AI Event: ${event}`, {
      event,
      model,
      tokens,
      ...context,
    });
  }

  performanceMetric(metric: string, value: number, unit: string, context?: LogContext) {
    this.debug(`Performance: ${metric} = ${value}${unit}`, {
      metric,
      value,
      unit,
      ...context,
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export types
export type { LogLevel, LogContext };
