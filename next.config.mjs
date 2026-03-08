/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use a separate build output folder to avoid stale/locked .next artifacts on Windows.
  distDir: ".next-runtime",
};

export default nextConfig;
