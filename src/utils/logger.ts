import {SentryService} from '@services/sentryService'; // For Sentry integration
import { Platform } from 'react-native';
import { Sanitizer } from './sanitizer'; // Import the sanitizer

enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: any; // Raw context for local buffer, will be sanitized for Sentry
}

const MAX_LOG_BUFFER_SIZE = 100;
const logBuffer: LogEntry[] = [];

const getTimestamp = (): string => new Date().toISOString();

const pushToLogBuffer = (level: LogLevel, message: string, context?: any) => {
  if (logBuffer.length >= MAX_LOG_BUFFER_SIZE) {
    logBuffer.shift(); // Remove the oldest log entry
  }
  logBuffer.push({ timestamp: getTimestamp(), level, message, context });
};

// Helper to format message for console, original context for dev, sanitized for prod console if desired
const formatConsoleMessage = (level: LogLevel, message: string, originalContext?: any): string => {
  let formattedMessage = `${getTimestamp()} [${level.toUpperCase()}] ${message}`;
  if (originalContext && Object.keys(originalContext).length > 0) {
    try {
      // For console output in DEV, show raw data. For PROD, sanitize if desired.
      // Sentry data is *always* sanitized by the log methods below.
      const contextToShow = __DEV__ ? originalContext : Sanitizer.sanitizeObject(originalContext);
      formattedMessage += ` | Context: ${JSON.stringify(contextToShow, null, 2)}`;
    } catch (e) {
      formattedMessage += ` | Context: (Unserializable)`;
    }
  }
  return formattedMessage;
};

const Logger = {
  debug: (message: string, context?: any): void => {
    pushToLogBuffer(LogLevel.DEBUG, message, context);
    if (__DEV__) { 
      console.debug(formatConsoleMessage(LogLevel.DEBUG, message, context));
    }
    SentryService.addBreadcrumb({
      category: 'log', // Generic log category
      message,
      data: context ? Sanitizer.sanitizeObject(context) : undefined, // Always sanitize for Sentry
      level: 'debug',
    });
  },

  info: (message: string, context?: any): void => {
    pushToLogBuffer(LogLevel.INFO, message, context);
    console.info(formatConsoleMessage(LogLevel.INFO, message, context));
    SentryService.addBreadcrumb({
      category: 'log',
      message,
      data: context ? Sanitizer.sanitizeObject(context) : undefined,
      level: 'info',
    });
  },

  warn: (message: string, context?: any): void => {
    pushToLogBuffer(LogLevel.WARN, message, context);
    console.warn(formatConsoleMessage(LogLevel.WARN, message, context));
    SentryService.addBreadcrumb({
      category: 'log',
      message,
      data: context ? Sanitizer.sanitizeObject(context) : undefined,
      level: 'warning',
    });
  },

  error: (message: string, error?: any, context?: any): void => {
    pushToLogBuffer(LogLevel.ERROR, message, { error, ...context });
    
    const combinedContext = { 
      ...(context || {}), 
      ...(typeof error === 'object' && error !== null && !(error instanceof Error) ? { originalErrorData: error } : {}) 
    };
    const sanitizedContextForSentry = Sanitizer.sanitizeObject(combinedContext);

    console.error(formatConsoleMessage(LogLevel.ERROR, message, error || context));
    
    const errorInstance = error instanceof Error ? error : new Error(String(message));
    if (!(error instanceof Error) && error && typeof error === 'object') {
      // Sanitize non-Error object content before attaching it to the error instance.
      (errorInstance as any).originalErrorContent = Sanitizer.sanitizeObject(error);
    } else if (!(error instanceof Error) && error) {
      // If error is not an object but some other type (e.g., string, number), convert to string.
      (errorInstance as any).originalErrorContent = String(error);
    }
    
    SentryService.captureException(errorInstance, {
      extra: {
        customMessage: message, 
        ...sanitizedContextForSentry, // Spread sanitized context here
      }
    });
  },

  network: (message: string, data?: {url: string, method: string, status?: number, requestBody?: any, responseBody?: any, durationMs?: number}): void => {
    const networkContext = { type: 'network', ...data };
    pushToLogBuffer(LogLevel.INFO, `[NETWORK] ${message}`, networkContext); // Store raw context locally
    if (__DEV__) {
      // Log raw data in dev for easier debugging
      console.log(formatConsoleMessage(LogLevel.INFO, `[NETWORK] ${message}`, data));
    }
    SentryService.addBreadcrumb({
      category: 'network',
      message: `[${data?.method?.toUpperCase()}] ${data?.url} - ${message}`,
      data: data ? Sanitizer.sanitizeObject(data) : undefined, // Sanitize for Sentry
      level: 'info',
    });
  },

  ui: (component: string, action: string, details?: any) => {
    const message = `UI Event: ${component} - ${action}`;
    const uiContext = { type: 'ui.action', component, action, ...details };
    pushToLogBuffer(LogLevel.DEBUG, message, uiContext); // Store raw context locally
    if (__DEV__) {
        // Log raw details in dev
        console.log(formatConsoleMessage(LogLevel.DEBUG, message, details));
    }
    SentryService.addBreadcrumb({
        category: 'ui.action',
        message,
        data: details ? Sanitizer.sanitizeObject(details) : undefined, // Sanitize for Sentry
        level: 'info', 
    });
  },

  logAuditEvent: (eventType: string, details: any): void => {
    const message = `AuditEvent: ${eventType}`;
    // The 'details' object might contain PII. It will be sanitized before sending to Sentry.
    // For local logBuffer, we store the original (potentially unsanitized) details for richer local debugging if needed.
    const auditContext = { type: 'audit', eventType, ...details }; 
    pushToLogBuffer(LogLevel.INFO, message, auditContext);
    
    // Sanitize details for console logging (especially in prod) and Sentry.
    const sanitizedDetails = Sanitizer.sanitizeObject(details);
    console.info(formatConsoleMessage(LogLevel.INFO, message, sanitizedDetails)); 

    SentryService.addBreadcrumb({
        category: 'audit', 
        message: eventType, 
        data: sanitizedDetails, 
        level: 'info', 
    });
  },

  getLogHistory: (): ReadonlyArray<LogEntry> => {
    return [...logBuffer]; // Return a copy
  },
};

export default Logger;