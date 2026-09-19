"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { site } from "@/lib/site";

interface LoginFormProps {
  mode: "setup" | "login";
}

export function LoginForm({ mode }: LoginFormProps) {
  const router = useRouter();
  const isSetup = mode === "setup";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (isSetup && password !== confirm) {
      setError("两次输入的密码不一致：请重新确认。");
      return;
    }

    setPending(true);
    try {
      const response = await fetch(isSetup ? "/api/auth/setup" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        setError(readError(payload) ?? `请求失败（HTTP ${response.status}）：请重试。`);
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
        <div className="mb-4 flex items-baseline justify-center gap-1.5">
          <span className="text-[17px] font-semibold tracking-[-0.02em]">{site.name}</span>
          <span className="text-muted-foreground text-[14px]">{site.nameZh}</span>
        </div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em]">
          {isSetup ? "创建管理员" : "登录"}
        </h1>
        <p className="text-muted-foreground mt-2 text-[13px] leading-relaxed">
          {isSetup
            ? "第一次使用，先设置管理员账号。之后分类与项目都在页面上维护。"
            : "登录后可以进入编辑模式，并看到 Private 内容。"}
        </p>
      </div>

      <form onSubmit={onSubmit} className="surface space-y-4 rounded-2xl p-6">
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
            autoComplete={isSetup ? "new-password" : "current-password"}
            required
            className="h-11 rounded-xl text-[16px] sm:text-[14px]"
          />
        </div>

        {isSetup ? (
          <div className="space-y-2">
            <Label htmlFor="confirm" className="text-[13px]">
              确认密码
            </Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              autoComplete="new-password"
              required
              className="h-11 rounded-xl text-[16px] sm:text-[14px]"
            />
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-destructive text-[13px] leading-relaxed">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-xl text-[14px] font-medium"
        >
          {pending ? "处理中…" : isSetup ? "创建并登录" : "登录"}
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
