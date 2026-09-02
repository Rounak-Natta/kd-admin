"use client";

import { useRouter } from "next/navigation";
import {
  FormEvent,
  useState,
  type ReactNode,
} from "react";

import {
  ArrowRight,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

import { Button } from "@/components/control-ui";

export default function ControlLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/control/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const body = await response.json();

      if (!response.ok || !body.success) {
        throw new Error(
          body.error || "Unable to sign in",
        );
      }

      router.replace("/control");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f6f8fb] lg:grid lg:grid-cols-[1.1fr_.9fr]">
      {/* Desktop branding panel */}
      <section className="relative hidden overflow-hidden bg-[#0b1220] lg:flex lg:min-h-screen lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-teal-400/10 blur-3xl" />

        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-400 text-slate-950">
            <Zap
              size={20}
              fill="currentColor"
            />
          </div>

          <div>
            <p className="text-sm font-bold text-white">
              Kitchen Diaries
            </p>

            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Control Center
            </p>
          </div>
        </div>

        <div className="relative max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-teal-200">
            <Sparkles size={13} />
            Operations, simplified
          </div>

          <h1 className="text-5xl font-bold leading-[1.05] tracking-[-0.05em] text-white xl:text-6xl">
            Run your restaurant network with clarity.
          </h1>

          <p className="mt-6 max-w-lg text-base leading-7 text-slate-400">
            Licensing, devices, subscriptions and system
            activity — designed into one focused command
            center.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-3">
            <Feature
              icon={<ShieldCheck size={16} />}
              text="Secure access"
            />

            <Feature
              icon={<Zap size={16} />}
              text="Live operations"
            />

            <Feature
              icon={<LockKeyhole size={16} />}
              text="Admin only"
            />
          </div>
        </div>

        <p className="relative text-xs text-slate-600">
          Kitchen Diaries · Internal operations
        </p>
      </section>

      {/* Login */}
      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[430px]">
          <div className="mb-9 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-teal-300">
              <Zap
                size={18}
                fill="currentColor"
              />
            </div>

            <div>
              <p className="text-sm font-bold text-slate-950">
                Kitchen Diaries
              </p>

              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Control Center
              </p>
            </div>
          </div>

          <div className="mb-8">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <LockKeyhole size={20} />
            </div>

            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal-600">
              Secure workspace
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-slate-950">
              Welcome back.
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Sign in to access the Kitchen Diaries
              administration console.
            </p>
          </div>

          <form
            onSubmit={submit}
            className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,.07)] sm:p-8"
          >
            {error && (
              <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm font-medium text-rose-700">
                {error}
              </div>
            )}

            <div className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Admin email
                </span>

                <input
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="username"
                  required
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Password
                </span>

                <input
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  type="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                />
              </label>

              <Button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl"
                icon={<ArrowRight size={16} />}
              >
                {loading
                  ? "Signing in…"
                  : "Sign in securely"}
              </Button>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 text-[11px] font-medium text-slate-400">
              <ShieldCheck
                size={14}
                className="text-teal-600"
              />

              Internal administrator access only
            </div>
          </form>

          <p className="mt-7 text-center text-xs text-slate-400">
            Protected control surface · Kitchen Diaries
          </p>
        </div>
      </section>
    </main>
  );
}

function Feature({
  icon,
  text,
}: {
  icon: ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2.5 text-xs font-medium text-slate-400">
      <span className="text-teal-300">
        {icon}
      </span>

      {text}
    </div>
  );
}