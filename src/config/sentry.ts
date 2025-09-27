import * as Sentry from '@sentry/node';
import { RewriteFrames } from '@sentry/integrations';

const initSentry = () => {
  if (!process.env.SENTRY_DSN) {
    console.warn('Sentry DSN not found. Error tracking will be disabled.');
    return null;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: `proplex-backend@${process.env.npm_package_version}`,
    integrations: [
      new RewriteFrames({
        root: process.cwd(),
      }),
    ],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  });

  return Sentry;
};

export { initSentry as initializeSentry };
