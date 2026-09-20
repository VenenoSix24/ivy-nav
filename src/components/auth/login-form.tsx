"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/portal/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { site } from "@/lib/site";

interface LoginFormProps {
  /** 还没有管理员账号时给出建号指引；建号只能在服务器上做 */
  needsSetup: boolean;
}

export function LoginForm({ needsSetup }: LoginFormProps) {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        setError(readError(payload) ?? `登录失败（HTTP ${response.status}）：请重试。`);
        return;
      }

      router.replace("/settings");
      router.refresh();
    } catch {
      setError("无法连接服务器：请检查网络后重试。");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-[380px]">
      <div className="mb-8 text-center">
        <div className="mb-4 flex flex-col items-center gap-3">
          <BrandMark className="size-12" />
          <div className="flex items-baseline justify-center gap-1.5">
            <span className="text-[17px] font-semibold tracking-[-0.02em]">{site.name}</span>
            <span className="text-muted-foreground text-[14px]">{site.nameZh}</span>
          </div>
        </div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em]">登录</h1>
        <p className="text-muted-foreground mt-2 text-[13px] leading-relaxed">
          登录后可以进入编辑模式，并看到 Private 内容。
        </p>
      </div>

      {needsSetup ? (
        <div className="border-border bg-secondary/60 mb-4 rounded-2xl border p-4 text-[13px] leading-relaxed">
          <p className="font-medium">还没有管理员账号</p>
          <p className="text-muted-foreground mt-1.5">
            建号只在服务器上进行，不通过网页。请在项目目录执行：
          </p>
          <code className="bg-popover mt-2 block rounded-lg px-2.5 py-1.5 font-mono text-[12px]">
            pnpm admin:create 你的用户名
          </code>
        </div>
      ) : null}

      {/* 显式写 post：万一脚本没跑起来，浏览器不会把密码拼进 URL（表单默认是 GET） */}
      <form method="post" onSubmit={onSubmit} className="surface space-y-4 rounded-2xl p-6">
        <div className="space-y-2">
          <Label htmlFor="username" className="text-[13px]">
            用户名
          </Label>
          <Input
            id="username"
            name="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            className="h-11 rounded-xl text-[16px] sm:text-[14px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-[13px]">
            密码
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            className="h-11 rounded-xl text-[16px] sm:text-[14px]"
          />
        </div>

        {error ? (
          <p role="alert" className="text-destructive text-[13px] leading-relaxed">
            {error}
          </p>
        ) : null}

        <noscript>
          <p className="text-destructive text-[13px] leading-relaxed">
            这个页面需要 JavaScript 才能提交：请在浏览器里启用后刷新重试。
          </p>
        </noscript>

        <Button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-xl text-[14px] font-medium"
        >
          {pending ? "处理中…" : "登录"}
        </Button>
      </form>

      <p className="mt-6 text-center">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground focus-visible:outline-ring rounded-md text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          回到首页
        </Link>
      </p>
    </div>
  );
}

function readError(payload: unknown): string | null {
  if (payload && typeof payload === "object" && "error" in payload) {
    const { error } = payload as { error?: unknown };
    return typeof error === "string" ? error : null;
  }
  return null;
}
