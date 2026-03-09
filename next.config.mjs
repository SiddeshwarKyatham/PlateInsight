/** @type {import('next').NextConfig} */
const isVercelBuild = process.env.VERCEL === "1";

const nextConfig = {
  // Keep custom output locally to avoid stale/locked .next artifacts on Windows.
  // Vercel expects the default ".next" output directory.
  ...(isVercelBuild ? {} : { distDir: ".next-runtime" }),
};

export default nextConfig;
