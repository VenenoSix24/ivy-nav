import type { NextConfig } from "next";

// 开发服务器放开的来源，默认含私有网段；需要别的域名用 ALLOWED_DEV_ORIGINS 追加
const devOrigins = [
  "localhost",
  "127.0.0.1",
  "192.168.*.*",
  "10.*.*.*",
  "172.16.*.*",
  ...(process.env.ALLOWED_DEV_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
];

const nextConfig: NextConfig = {
  allowedDevOrigins: devOrigins,

  distDir: process.env.NEXT_DIST_DIR ?? ".next",

  output: "standalone",

  // better-sqlite3 是原生模块
  serverExternalPackages: ["better-sqlite3"],

  // 运行期读取的迁移文件，要一起带进产物
  outputFileTracingIncludes: {
    "/**": ["./src/db/migrations/**"],
  },

  // 本机数据，不跟着构建产物发出去
  outputFileTracingExcludes: {
    "/**": ["./data/**", "./backups/**", "./TASKS.md", "./.history/**"],
  },
};

export default nextConfig;
