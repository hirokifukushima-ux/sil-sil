import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

// PWA設定を条件付きで適用（プロダクション環境でのみ）
const withPWA = 
  process.env.NODE_ENV === 'production' 
    ? require('next-pwa')({
        dest: 'public',
        register: true,
        skipWaiting: true,
        disable: false,
      })
    : (config: NextConfig) => config;

export default withPWA(nextConfig);
