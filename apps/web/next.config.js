import path from "node:path";
import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // self-contained server for the Docker image; the tracing root is the monorepo
  // root so workspace packages (@ajaykumar_br/*) are bundled into it
  output: "standalone",
  outputFileTracingRoot: path.join(path.dirname(fileURLToPath(import.meta.url)), "../../"),
};

export default nextConfig;
