// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Revert to standalone output to support dynamic routes
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
