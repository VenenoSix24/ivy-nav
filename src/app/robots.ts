import type { MetadataRoute } from "next";

/** 公开首页允许收录；接口与管理页面不该出现在搜索结果里（设计文档 §44）。 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/login", "/settings"],
      },
    ],
  };
}
