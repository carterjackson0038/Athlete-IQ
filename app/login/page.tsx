"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

const pendingProfileKey = "athleteiq.pendingSignupProfile.v1";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErrorMessage(error.message);
      setSubmitting(false);
      return;
    }
    let needsOnboarding = false;
    try {
      const pending = window.localStorage.getItem(pendingProfileKey);
      if (pending) {
        const parsed: unknown = JSON.parse(pending);
        needsOnboarding = !!parsed && typeof parsed === "object" && "userId" in parsed && parsed.userId === data.user.id;
      }
    } catch {
      // A damaged pending record should not prevent login.
    }
    router.push(needsOnboarding ? "/onboarding" : "/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4 py-8 text-slate-900">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <Link href="/" className="text-sm font-bold text-indigo-700">← AthleteIQ</Link>
        <p className="mt-6 text-xs font-bold uppercase tracking-wider text-indigo-600">BACK IN THE GAME</p>
        <h1 className="mt-2 text-3xl font-black">Welcome back</h1>
        <p className="mt-2 text-sm text-slate-500">Log in to pick up where you left off.</p>
        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold">Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label>
          <label className="block text-sm font-semibold">Password<input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label>
          {errorMessage && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{errorMessage}</p>}
          <button disabled={submitting} type="submit" className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">{submitting ? "Logging in…" : "Log in"}</button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-500">New to AthleteIQ? <Link href="/signup" className="font-bold text-indigo-700 underline">Create an account</Link></p>
      </div>
    </main>
  );
}
