/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep production builds separate from the live development cache.
  // Running `next build` can otherwise invalidate CSS used by an open dev server.
  distDir: process.env.NODE_ENV === "production" ? ".next-build" : ".next"
};

export default nextConfig;
