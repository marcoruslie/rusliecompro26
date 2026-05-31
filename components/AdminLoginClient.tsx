"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usernameToEmail } from "@/lib/auth";

export default function AdminLoginClient() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Username and password are required.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });
    setLoading(false);

    if (signInError) {
      setError("Invalid username or password.");
      return;
    }

    router.replace("/admin/dashboard");
    router.refresh();
  }

  return (
    <div className="admin-shell flex items-center justify-center px-4">
      <div className="admin-content w-full max-w-sm">
        <div className="admin-panel admin-panel-glow admin-rise rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-7">
            <div className="admin-badge w-10 h-10 rounded-xl text-lg">R</div>
            <div>
              <h1 className="admin-title text-lg leading-none">Admin</h1>
              <p className="admin-eyebrow mt-1.5">Ruslie Spring · Secure</p>
            </div>
            <span className="ml-auto flex items-center gap-1.5 text-[0.6rem] font-mono uppercase tracking-[0.2em] text-cyan-300/70">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Online
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="admin-label">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                className="admin-input"
                placeholder="e.g. admin"
              />
            </div>

            <div>
              <label className="admin-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="admin-input"
                placeholder="Enter your password"
              />
            </div>

            {error && <p className="admin-error">⚠ {error}</p>}

            <button type="submit" disabled={loading} className="admin-btn w-full mt-1">
              {loading ? "Authenticating…" : "Authenticate"}
            </button>
          </form>
        </div>

        <p className="text-center mt-5 text-[0.6rem] font-mono uppercase tracking-[0.25em] text-slate-500">
          Ruslie Spring Control Panel
        </p>
      </div>
    </div>
  );
}
