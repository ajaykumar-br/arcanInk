const secret = process.env.JWT_SECRET;

// A guessable fallback is only acceptable for local development.
if (!secret && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET must be set when NODE_ENV=production");
}

export const JWT_SECRET = secret || "dev-only-insecure-secret";
