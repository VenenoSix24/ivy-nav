import type { MetadataRoute } from "next";

/** 允许收录首页，屏蔽接口与管理页面。 */
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
