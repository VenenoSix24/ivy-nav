import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 自托管部署用 standalone 输出：产物自带所需依赖，服务器上不需要再装一遍 node_modules
  output: "standalone",

  // better-sqlite3 是原生模块，必须保持外部引用而不是被打进 bundle
  serverExternalPackages: ["better-sqlite3"],

  // 迁移文件是运行期读取的（首次访问时自动建表），要一起带进 standalone 产物
  outputFileTracingIncludes: {
    "/**": ["./src/db/migrations/**"],
  },

  // 这些是本机的运行数据与本地笔记，绝不能跟着构建产物发出去
  outputFileTracingExcludes: {
    "/**": ["./data/**", "./backups/**", "./TASKS.md", "./.history/**"],
  },
};

export default nextConfig;
