"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

const pendingProfileKey = "athleteiq.pendingSignupProfile.v1";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sport, setSport] = useState("Football");
  const [educationLevel, setEducationLevel] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setNotice("");
    setSubmitting(true);

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setErrorMessage(error.message);
      setSubmitting(false);
      return;
    }

    if (!data.user) {
      setErrorMessage("We couldn't create your account. Please try again.");
      setSubmitting(false);
      return;
    }

    if (data.session) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        username: username.trim(),
        sport,
        education_level: educationLevel,
        xp: 0,
      });
      if (profileError) {
        setErrorMessage(profileError.message);
        setSubmitting(false);
        return;
      }
      router.push("/onboarding");
      return;
    }

    try {
      window.localStorage.setItem(pendingProfileKey, JSON.stringify({
        userId: data.user.id,
        username: username.trim(),
        sport,
        educationLevel,
      }));
    } catch {
      setErrorMessage("Your browser couldn't save the profile details needed after email confirmation. Enable browser storage and try again.");
      setSubmitting(false);
      return;
    }
    setNotice("Check your email to confirm your account, then log in to continue.");
    setSubmitting(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4 py-8 text-slate-900">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <Link href="/" className="text-sm font-bold text-indigo-700">← AthleteIQ</Link>
        <p className="mt-6 text-xs font-bold uppercase tracking-wider text-indigo-600">START YOUR SEASON</p>
        <h1 className="mt-2 text-3xl font-black">Create your account</h1>
        <p className="mt-2 text-sm text-slate-500">Build better study habits, one session at a time.</p>
        <form onSubmit={handleSignup} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold">Username<input required minLength={2} maxLength={40} autoComplete="nickname" value={username} onChange={(event) => setUsername(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label>
          <label className="block text-sm font-semibold">Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label>
          <label className="block text-sm font-semibold">Password<input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /><span className="mt-1 block text-xs font-normal text-slate-500">Use at least 8 characters.</span></label>
          <label className="block text-sm font-semibold">Sport<select value={sport} onChange={(event) => setSport(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal"><option>Football</option><option>Basketball</option><option>Baseball</option><option>Soccer</option><option>Track &amp; Field</option><option>Volleyball</option><option>Tennis</option><option>Swimming</option><option>Other</option></select></label>
          <label className="block text-sm font-semibold">Education level<select required value={educationLevel} onChange={(event) => setEducationLevel(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal"><option value="" disabled>Select your level</option><option>Middle School</option><option>High School Freshman</option><option>High School Sophomore</option><option>High School Junior</option><option>High School Senior</option><option>College Freshman</option><option>College Sophomore</option><option>College Junior</option><option>College Senior</option><option>Graduate Student</option><option>Other</option></select></label>
          {errorMessage && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{errorMessage}</p>}
          {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
          <button disabled={submitting} type="submit" className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">{submitting ? "Creating account…" : "Get started"}</button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-500">Already have an account? <Link href="/login" className="font-bold text-indigo-700 underline">Log in</Link></p>
      </div>
    </main>
  );
}
