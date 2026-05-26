"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (mode === "signup") {
        const res = await authClient.signUp.email({ email, password, name });
        if (res.error) throw new Error(res.error.message);
      } else {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message);
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-white border border-zinc-200 rounded-xl p-8 shadow-sm space-y-4"
      >
        <h1 className="text-xl font-semibold text-center">写作工作室</h1>
        {mode === "signup" && (
          <input
            className="w-full border rounded-lg px-3 py-2"
            placeholder="昵称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}
        <input
          className="w-full border rounded-lg px-3 py-2"
          type="email"
          placeholder="邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full border rounded-lg px-3 py-2"
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full bg-zinc-900 text-white py-2 rounded-lg"
        >
          {mode === "login" ? "登录" : "注册"}
        </button>
        <button
          type="button"
          className="w-full text-sm text-zinc-500"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "没有账号？注册" : "已有账号？登录"}
        </button>
      </form>
    </div>
  );
}
