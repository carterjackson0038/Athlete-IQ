"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const preferencesKey = "athleteiq.studyPreferences.v1";
const pendingProfileKey = "athleteiq.pendingSignupProfile.v1";
const sports = ["Football", "Basketball", "Baseball", "Soccer", "Track & Field", "Volleyball", "Tennis", "Swimming", "Other"];
const educationLevels = ["Middle School", "High School Freshman", "High School Sophomore", "High School Junior", "High School Senior", "College Freshman", "College Sophomore", "College Junior", "College Senior", "Graduate Student", "Other"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [sport, setSport] = useState("Football");
  const [educationLevel, setEducationLevel] = useState("");
  const [username, setUsername] = useState("");
  const [subject, setSubject] = useState("");
  const [mission, setMission] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data } = await supabase.from("profiles").select("username, sport, education_level").eq("id", user.id).maybeSingle();
      if (active && data) {
        if (data.username) setUsername(data.username);
        if (data.sport) setSport(data.sport);
        if (data.education_level) setEducationLevel(data.education_level);
      }
      if (active) {
        try {
          const pendingText = window.localStorage.getItem(pendingProfileKey);
          const pending: unknown = pendingText ? JSON.parse(pendingText) : null;
          if (pending && typeof pending === "object" && "userId" in pending && pending.userId === user.id) {
            if ("username" in pending && typeof pending.username === "string") setUsername(pending.username);
            if ("sport" in pending && typeof pending.sport === "string") setSport(pending.sport);
            if ("educationLevel" in pending && typeof pending.educationLevel === "string") setEducationLevel(pending.educationLevel);
          }
        } catch {
          // Pending signup details are optional when browser storage is unavailable.
        }
      }
    }
    void loadProfile();
    return () => { active = false; };
  }, [router]);

  async function finishOnboarding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrorMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    let pending: { userId: string; username: string; sport: string; educationLevel: string } | null = null;
    try {
      const pendingText = window.localStorage.getItem(pendingProfileKey);
      const parsed: unknown = pendingText ? JSON.parse(pendingText) : null;
      if (parsed && typeof parsed === "object" && "userId" in parsed && parsed.userId === user.id && "username" in parsed && "sport" in parsed && "educationLevel" in parsed && typeof parsed.username === "string" && typeof parsed.sport === "string" && typeof parsed.educationLevel === "string") {
        pending = { userId: parsed.userId as string, username: parsed.username, sport: parsed.sport, educationLevel: parsed.educationLevel };
      }
    } catch {
      // Continue with the signed-in profile when no pending signup is available.
    }
    const profilePayload: { id: string; username: string; sport: string; education_level: string; xp?: number } = {
      id: user.id,
      username: pending?.username || username || user.email?.split("@")[0] || "Athlete",
      sport,
      education_level: educationLevel,
    };
    if (pending) profilePayload.xp = 0;
    const { error } = await supabase.from("profiles").upsert(profilePayload, { onConflict: "id" });
    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }
    try {
      window.localStorage.setItem(`${preferencesKey}.${user.id}`, JSON.stringify({ subject: subject.trim(), mission: mission.trim() }));
    } catch {
      // Optional preferences do not block the rest of onboarding.
    }
    if (pending) {
      try { window.localStorage.removeItem(pendingProfileKey); } catch { /* Onboarding is already saved. */ }
    }
    router.push("/dashboard");
  }

  const titles = ["", "Welcome to AthleteIQ 🏆", "What best describes you?", "What sport do you play?", "What subject are you studying?", "What's today's mission?"];
  const subtitles = ["", "Let's build your season.", "We'll personalize AthleteIQ for you.", "Choose your primary sport.", "We'll tailor your first study plan.", "Tell us what you want to accomplish."];

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4 py-8 text-slate-900">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
        <div className="mb-7 flex items-center justify-between"><Link href="/" className="text-sm font-bold text-indigo-700">AthleteIQ</Link><span className="text-xs font-bold text-slate-400">STEP {step} OF 5</span></div>
        <div className="mb-7 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${step * 20}%` }} /></div>
        <h1 className="text-3xl font-black">{titles[step]}</h1>
        <p className="mt-2 text-slate-500">{subtitles[step]}</p>

        {step === 1 && <div className="mt-7 rounded-2xl bg-indigo-50 p-5"><p className="font-bold text-indigo-950">Your season starts with one small win.</p><p className="mt-1 text-sm leading-6 text-indigo-900/75">Set up your athlete profile and tell your coach what you&apos;re working on.</p></div>}
        {step === 2 && <div className="mt-7 grid grid-cols-2 gap-3">{educationLevels.map((level) => <button key={level} type="button" onClick={() => setEducationLevel(level)} className={`rounded-xl border p-3 text-left text-sm font-semibold transition ${educationLevel === level ? "border-indigo-600 bg-indigo-50 text-indigo-800" : "border-slate-200 hover:border-indigo-300"}`}>{level}</button>)}</div>}
        {step === 3 && <div className="mt-7 grid grid-cols-2 gap-3">{sports.map((option) => <button key={option} type="button" onClick={() => setSport(option)} className={`rounded-xl border p-3 text-left text-sm font-semibold transition ${sport === option ? "border-indigo-600 bg-indigo-50 text-indigo-800" : "border-slate-200 hover:border-indigo-300"}`}>{option}</button>)}</div>}
        {step === 4 && <label className="mt-7 block text-sm font-semibold">What subject should we focus on?<input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={80} placeholder="e.g. Biology, Algebra, History" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label>}
        {step === 5 && <form id="finish-onboarding" onSubmit={finishOnboarding} className="mt-7"><label className="block text-sm font-semibold">What are you aiming to finish today?<textarea required value={mission} onChange={(event) => setMission(event.target.value)} maxLength={240} rows={3} placeholder="e.g. Review chapter 4 and finish my lab notes" className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label></form>}

        {errorMessage && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{errorMessage}</p>}
        <div className="mt-8 flex gap-3">
          {step > 1 && <button type="button" onClick={() => setStep(step - 1)} className="rounded-xl border border-slate-200 px-5 py-3 font-bold text-slate-600">Back</button>}
          {step < 5 ? <button type="button" onClick={() => { if (step === 2 && !educationLevel) { setErrorMessage("Choose your education level to continue."); return; } setErrorMessage(""); setStep(step + 1); }} className="flex-1 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-700">Continue</button> : <button form="finish-onboarding" disabled={saving} type="submit" className="flex-1 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-700 disabled:opacity-60">{saving ? "Saving your profile…" : "Go to my dashboard"}</button>}
        </div>
      </div>
    </main>
  );
}
