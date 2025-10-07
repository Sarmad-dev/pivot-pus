import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow ngrok origins for development
  // async headers() {
  //   const headers = [];

  //   // Add CORS headers for ngrok in development
  //   if (
  //     process.env.NODE_ENV === "development" &&
  //     process.env.NEXT_PUBLIC_APP_URL
  //   ) {
  //     const ngrokUrl = new URL(process.env.NEXT_PUBLIC_APP_URL);
  //     headers.push({
  //       source: "/_next/:path*",
  //       headers: [
  //         {
  //           key: "Access-Control-Allow-Origin",
  //           value: process.env.NEXT_PUBLIC_APP_URL,
  //         },
  //         {
  //           key: "Access-Control-Allow-Methods",
  //           value: "GET, POST, PUT, DELETE, OPTIONS",
  //         },
  //         {
  //           key: "Access-Control-Allow-Headers",
  //           value: "Content-Type, Authorization",
  //         },
  //       ],
  //     });
  //   }

  //   return headers;
  // },

  // // Configure allowed dev origins for newer Next.js versions
  // ...(process.env.NODE_ENV === "development" && {
  //   experimental: {
  //     // @ts-ignore - This might be available in newer versions
  //     allowedDevOrigins: [
  //       "b9fb454900ad.ngrok-free.app",
  //       "*.ngrok-free.app",
  //       "*.ngrok.io",
  //       "localhost:3000",
  //     ],
  //   } as any,
  // }),
};

export default nextConfig;
