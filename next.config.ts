import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    // חותמת הבנייה, מוטמעת גם בבאנדל של הלקוח וגם בשרת. AutoReload משווה
    // ביניהן: פער = יש פריסה חדשה = רענון. נקבעת פעם אחת בזמן build.
    NEXT_PUBLIC_BUILD_TS: Date.now().toString(),
  },
};

export default nextConfig;
