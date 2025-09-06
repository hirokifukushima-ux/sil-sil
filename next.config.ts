import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

// PWA設定を条件付きで適用（プロダクション環境でのみ）
let withPWA: (config: NextConfig) => NextConfig;

if (process.env.NODE_ENV === 'production') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: false,
  });
} else {
  withPWA = (config: NextConfig) => config;
}

export default withPWA(nextConfig);
