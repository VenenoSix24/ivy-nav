import { getDb, resolveDatabasePath } from "./client";
import { seedDatabase } from "./seed-data";

const result = seedDatabase(getDb());

if (result.categories === 0) {
  console.log(`数据库已有内容，跳过种子数据：${resolveDatabasePath()}`);
  console.log("需要重新灌入时，删除该文件后再次执行 pnpm db:seed。");
} else {
  console.log(
    `已写入 ${result.categories} 个分类、${result.items} 个项目、${result.tags} 个标签 → ${resolveDatabasePath()}`,
  );
}
