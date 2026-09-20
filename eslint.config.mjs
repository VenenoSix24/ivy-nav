import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-dev/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "data/**",
    "backups/**",
    // 编辑器的本地历史（VS Code Local History 之类）会存半成品的快照，
    // 那些文件语法多半不完整，扫它们只会得到一串解析错误
    ".history/**",
    "scripts/e2e/.tmp/**",
  ]),
]);

export default eslintConfig;
