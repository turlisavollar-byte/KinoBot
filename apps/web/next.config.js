/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: process.env.NEXT_BASE_PATH || "/web",
  output: "standalone",
  experimental: {
    outputFileTracingRoot: require("path").join(__dirname, "../.."),
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ["@streamx/api-client"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.pexels.com",
        pathname: "/photos/**",
      },
    ],
  },
};

module.exports = nextConfig;
