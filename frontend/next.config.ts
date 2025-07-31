import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker optimization
  output: 'standalone',
  
  // Optimize for production
  poweredByHeader: false,
  reactStrictMode: true,
  
  // Image optimization
  images: {
    unoptimized: false,
    domains: [],
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Experimental features
  experimental: {
    // Enable optimizations
    optimizeCss: true,
  },
};

export default nextConfig;
