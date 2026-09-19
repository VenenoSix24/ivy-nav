import { createInterface } from "node:readline/promises";
import { createFirstAdminUser, listAdminUsers, resetAllPasswords } from "./users";
import { PASSWORD_MIN_LENGTH, checkPasswordStrength, hashPassword } from "@/lib/auth/password";

/**
 * 管理员只在服务器上创建，不通过网页：门户本身是公开可访问的，
 * 一个「谁都能打开的建号页面」本身就是缺口（设计文档 §11 单管理员）。
 *
 * 用法：
 *   pnpm admin:create <用户名>                      首次创建
 *   pnpm admin:create --reset                       重置现有管理员密码
 *   ADMIN_PASSWORD=... pnpm admin:create <用户名>    不走交互，便于脚本化
 */
async function main() {
  const args = process.argv.slice(2);
  const reset = args.includes("--reset");
  const username = args.find((arg) => !arg.startsWith("--"))?.trim();

  const existing = listAdminUsers();
  if (existing.length > 0 && !reset) {
    console.error(
      `已经存在管理员账号（${existing.map((row) => row.username).join("、")}）。\n` +
        "重置密码用 pnpm admin:create --reset，或登录后在设置页修改。",
    );
    process.exitCode = 1;
    return;
  }

  const terminal = process.stdin.isTTY
    ? createInterface({ input: process.stdin, output: process.stdout })
    : null;

  const fail = (message: string) => {
    console.error(message);
    terminal?.close();
    process.exitCode = 1;
  };

  let name = username;
  if (!reset && !name) {
    if (!terminal) {
      fail("没有可用的交互终端：请用 pnpm admin:create <用户名> 指定用户名。");
      return;
    }
    name = (await terminal.question("管理员用户名：")).trim();
  }

  if (!reset && !name) {
    fail("用户名不能为空：请重新运行并填写。");
    return;
  }

  let password = process.env.ADMIN_PASSWORD ?? "";
  if (!password) {
    if (!terminal) {
      fail("没有可用的交互终端：请用 ADMIN_PASSWORD=... 提供密码。");
      return;
    }
    password = await terminal.question(`密码（至少 ${PASSWORD_MIN_LENGTH} 位）：`);
    const confirm = await terminal.question("再输一次：");
    if (password !== confirm) {
      fail("两次输入不一致：请重新运行。");
      return;
    }
  }

  terminal?.close();

  const strength = checkPasswordStrength(password);
  if (strength) {
    console.error(strength);
    process.exitCode = 1;
    return;
  }

  const passwordHash = await hashPassword(password);

  if (reset) {
    const count = resetAllPasswords(passwordHash);
    console.log(`已重置 ${count} 个管理员账号的密码，现在可以在 /login 登录。`);
    return;
  }

  const created = createFirstAdminUser(name!, passwordHash);
  if (!created) {
    console.error("创建失败：已经存在管理员账号，请改用 --reset 重置密码。");
    process.exitCode = 1;
    return;
  }

  console.log(`已创建管理员 ${name}，现在可以在 /login 登录。`);
}

// 项目没有 "type": "module"，tsx 按 CJS 跑，用顶层 await 会直接报错
main().catch((error: unknown) => {
  console.error("创建失败：", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
