// Inlined at build time (NEXT_PUBLIC_*); the defaults suit local development.
export const HTTP_BACKEND_URL = process.env.NEXT_PUBLIC_HTTP_BACKEND_URL ?? "http://localhost:3001";
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080";
