"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsSection } from "@/components/settings/settings-section";

interface AccountSettingsProps {
  username: string;
  sessionExpiresAt: string;
}

export function AccountSettings({ username, sessionExpiresAt }: AccountSettingsProps) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState<"logout" | "logout-all" | null>(null);

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (newPassword !== confirm) {
      setMessage({ tone: "error", text: "两次输入的新密码不一致：请重新确认。" });
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage({
          tone: "error",
          text: readError(payload) ?? `修改失败（HTTP ${response.status}）：请重试。`,
        });
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      setMessage({ tone: "ok", text: "密码已更新，其它设备上的登录已失效。" });
    } catch {
      setMessage({ tone: "error", text: "无法连接服务器：请检查网络后重试。" });
    } finally {
      setPending(false);
    }
  }

  async function signOut(scope: "logout" | "logout-all") {
    setBusy(scope);
    try {
      const response = await fetch(
        scope === "logout" ? "/api/auth/logout" : "/api/auth/logout-all",
        {
          method: "POST",
        },
      );
      if (!response.ok) {
        setMessage({ tone: "error", text: `退出失败（HTTP ${response.status}）：请重试。` });
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: "无法连接服务器：请检查网络后重试。" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <SettingsSection
        title="账号"
        description={`当前登录：${username}｜本次会话有效至 ${formatDateTime(sessionExpiresAt)}`}
      >
        <form onSubmit={changePassword} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="current-password" label="当前密码">
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
                required
                className="h-10 rounded-xl text-[16px] sm:text-[14px]"
              />
            </Field>
            <Field id="new-password" label="新密码">
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                required
                className="h-10 rounded-xl text-[16px] sm:text-[14px]"
              />
            </Field>
            <Field id="confirm-password" label="确认新密码">
              <Input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                autoComplete="new-password"
                required
                className="h-10 rounded-xl text-[16px] sm:text-[14px]"
              />
            </Field>
          </div>

          {message ? (
            <p
              role="status"
              className={
                message.tone === "ok"
                  ? "text-accent-foreground text-[13px]"
                  : "text-destructive text-[13px]"
              }
            >
              {message.text}
            </p>
          ) : null}

          <Button type="submit" disabled={pending} className="h-9 rounded-xl px-4 text-[13px]">
            {pending ? "保存中…" : "修改密码"}
          </Button>
        </form>
      </SettingsSection>

      <SettingsSection title="会话" description="退出所有设备会立即吊销全部会话，包括当前这台。">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => signOut("logout")}
            disabled={busy !== null}
            className="h-9 rounded-xl px-4 text-[13px]"
          >
            {busy === "logout" ? "退出中…" : "退出登录"}
          </Button>
          <Button
            variant="destructive"
            onClick={() => signOut("logout-all")}
            disabled={busy !== null}
            className="h-9 rounded-xl px-4 text-[13px]"
          >
            {busy === "logout-all" ? "吊销中…" : "退出所有设备"}
          </Button>
        </div>
      </SettingsSection>
    </>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-[13px]">
        {label}
      </Label>
      {children}
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

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
