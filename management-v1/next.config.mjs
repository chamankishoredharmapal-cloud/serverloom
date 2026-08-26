import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["pg"],
  outputFileTracingRoot: path.resolve(import.meta.dirname),
};
export default nextConfig;
