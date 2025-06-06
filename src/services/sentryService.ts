
import * as Sentry from '@sentry/react-native';
import {SENTRY_DSN} from '@env'; // Make sure @env is configured or use process.env

// For bare React Native projects, ensure you've run `sentry-wizard` or manually linked.
// npx @sentry/wizard -i reactNative -p ios android

const routingInstrumentation = new Sentry.ReactNavigationInstrumentation();

export const SentryService = {
  init: () => {
    if (!SENTRY_DSN || SENTRY_DSN === 'your_sentry_dsn_here') {
      console.warn(
        'Sentry DSN not found. Sentry will not be initialized. Please set SENTRY_DSN in your .env file.',
      );
      return;
    }

    Sentry.init({
      dsn: SENTRY_DSN,
      debug: __DEV__, // If true, Sentry will try to print out useful debugging information.
      tracesSampleRate: __DEV__ ? 1.0 : 0.3, // Adjust sample rate for production
      // Performance Monitoring
      integrations: [
        new Sentry.ReactNativeTracing({
          routingInstrumentation,
          // ... other options
        }),
      ],
      // Consider adding release and environment for better tracking
      // release: 'myapp@1.0.0', // Your app release version
      // environment: __DEV__ ? 'development' : 'production',
      beforeSend: (event, hint) => {
        // You can modify the event here or prevent it from being sent
        if (__DEV__) {
          console.log('Sentry Event (Dev only):', event, hint?.originalException);
          // return null; // Uncomment to prevent sending events in DEV
        }
        return event;
      },
      // beforeBreadcrumb: (breadcrumb, hint) => {
      //   // Modify or drop breadcrumbs
      //   return breadcrumb;
      // }
    });

    console.log('Sentry initialized.');
  },

  // Wrap your root component with Sentry.wrap to enable performance monitoring and error boundaries
  wrap: <P extends object>(component: React.ComponentType<P>): React.FC<P> => {
    return Sentry.wrap(component);
  },
  
  // Manual error reporting
  captureException: (error: any, context?: any) => {
    Sentry.captureException(error, context);
    if (__DEV__) {
      console.error("Sentry captured exception (Dev only):", error, context);
    }
  },

  // Manual message reporting
  captureMessage: (message: string, level: Sentry.SeverityLevel = 'info') => {
    Sentry.captureMessage(message, level);
     if (__DEV__) {
      console.log(`Sentry captured message (Dev only) [${level}]:`, message);
    }
  },

  // Add breadcrumbs for context
  addBreadcrumb: (breadcrumb: Sentry.Breadcrumb) => {
    Sentry.addBreadcrumb(breadcrumb);
  },

  // Set user context
  setUser: (user: Sentry.User | null) => {
    Sentry.setUser(user); // e.g. { id: '123', email: 'user@example.com', username: 'user123' }
  },

  // Set custom tags
  setTag: (key: string, value: string) => {
    Sentry.setTag(key, value);
  },

  // Set extra context
  setExtra: (key: string, extra: any) => {
    Sentry.setContext(key, extra); // Using setContext as setExtra is part of older SDKs
  },

  // For React Navigation performance monitoring
  routingInstrumentation,
};
