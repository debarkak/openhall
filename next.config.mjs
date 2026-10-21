/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  experimental: {
    instrumentationHook: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
