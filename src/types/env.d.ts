
declare module '@env' {
  export const API_URL: string;
  export const SENTRY_DSN: string;
  export const API_KEY: string; // For GenAI or other services

  // TURN server configuration (optional, with fallbacks in rtcService)
  export const TURN_URL: string | undefined;
  export const TURN_USERNAME: string | undefined;
  export const TURN_PASSWORD: string | undefined;
}