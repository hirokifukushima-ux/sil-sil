import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // ⚠️ Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    NEXT_PUBLIC_USE_DATABASE: process.env.NEXT_PUBLIC_USE_DATABASE,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SKIP_AUTH: process.env.NEXT_PUBLIC_SKIP_AUTH,
  },
};

// PWA設定を一時的に無効化（ビルドエラー修正のため）
// let withPWA: (config: NextConfig) => NextConfig;

// if (process.env.NODE_ENV === 'production') {
//   // eslint-disable-next-line @typescript-eslint/no-require-imports
//   withPWA = require('next-pwa')({
//     dest: 'public',
//     register: true,
//     skipWaiting: true,
//     disable: false,
//   });
// } else {
//   withPWA = (config: NextConfig) => config;
// }

export default nextConfig;
