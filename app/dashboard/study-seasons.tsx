"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type StudySeason = {
  id: string;
  title: string;
  examDate: string;
  difficulty: "Easy" | "Moderate" | "Challenging";
};

const storagePrefix = "athleteiq.studySeasons.v1";
const guestStorageKey = `${storagePrefix}.guest`;
const seasonLimit = 5;

function isStudySeason(value: unknown): value is StudySeason {
  if (!value || typeof value !== "object") return false;
  const season = value as Partial<StudySeason>;
  return typeof season.id === "string" && typeof season.title === "string" &&
    typeof season.examDate === "string" &&
    (season.difficulty === "Easy" || season.difficulty === "Moderate" || season.difficulty === "Challenging");
}

function daysUntil(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const target = Date.UTC(year, month - 1, day);
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target - todayUtc) / 86_400_000);
}

export default function StudySeasons() {
  const [seasons, setSeasons] = useState<StudySeason[]>([]);
  const [storageKey, setStorageKey] = useState(guestStorageKey);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  const [difficulty, setDifficulty] = useState<StudySeason["difficulty"]>("Moderate");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function loadSeasons() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      const nextStorageKey = user ? `${storagePrefix}.${user.id}` : guestStorageKey;
      setStorageKey(nextStorageKey);
      try {
        const saved = window.localStorage.getItem(nextStorageKey);
        const parsed: unknown = saved ? JSON.parse(saved) : [];
        if (Array.isArray(parsed)) setSeasons(parsed.filter(isStudySeason).slice(0, seasonLimit));
      } catch {
        setMessage("Your saved seasons couldn’t be loaded on this device.");
      }
    }
    void loadSeasons();
    return () => { active = false; };
  }, []);

  function addSeason(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (seasons.length >= seasonLimit) {
      setMessage(`You can keep up to ${seasonLimit} study seasons here.`);
      return;
    }
    const season: StudySeason = {
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: title.trim(),
      examDate,
      difficulty,
    };
    const nextSeasons = [season, ...seasons];
    setSeasons(nextSeasons);
    setTitle("");
    setExamDate("");
    setDifficulty("Moderate");
    setIsAdding(false);
    setMessage("");
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(nextSeasons));
    } catch {
      setMessage("This season is available for now, but couldn’t be saved on this device.");
    }
  }

  function removeSeason(id: string) {
    const nextSeasons = seasons.filter((season) => season.id !== id);
    setSeasons(nextSeasons);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(nextSeasons));
    } catch {
      setMessage("The season was removed for now, but this change couldn’t be saved on this device.");
    }
  }

  return (
    <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="study-seasons-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">YOUR SEASON</p>
          <h2 id="study-seasons-title" className="mt-1 text-xl font-extrabold">Study Seasons</h2>
          <p className="mt-1 text-sm text-slate-500">Keep a big test in sight and break the countdown into steady progress.</p>
        </div>
        <span className="text-2xl" aria-hidden="true">🏁</span>
      </div>

      {seasons.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-indigo-50 p-4 text-sm leading-6 text-indigo-950">No season on the calendar yet. Add an exam or major assignment to give your next study sessions a target.</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {seasons.map((season) => {
            const remaining = daysUntil(season.examDate);
            const countdown = remaining < 0 ? `Passed ${Math.abs(remaining)} ${Math.abs(remaining) === 1 ? "day" : "days"} ago` : remaining === 0 ? "Exam day" : `${remaining} ${remaining === 1 ? "day" : "days"} to go`;
            return (
              <li key={season.id} className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words font-bold text-slate-900">{season.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{new Date(`${season.examDate}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · {season.difficulty}</p>
                  </div>
                  <button type="button" onClick={() => removeSeason(season.id)} aria-label={`Remove ${season.title}`} className="rounded-lg px-2 text-lg leading-6 text-slate-400 hover:bg-white hover:text-rose-600">×</button>
                </div>
                <p className="mt-3 text-sm font-extrabold text-indigo-700">{countdown}</p>
              </li>
            );
          })}
        </ul>
      )}

      {isAdding && (
        <form onSubmit={addSeason} className="mt-4 grid gap-3 rounded-2xl border border-slate-200 p-4 sm:grid-cols-2">
          <label className="text-sm font-semibold sm:col-span-2">Season name<input autoFocus required maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Biology final" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label>
          <label className="text-sm font-semibold">Exam date<input required type="date" value={examDate} onChange={(event) => setExamDate(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label>
          <label className="text-sm font-semibold">How challenging?<select value={difficulty} onChange={(event) => setDifficulty(event.target.value as StudySeason["difficulty"])} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"><option>Easy</option><option>Moderate</option><option>Challenging</option></select></label>
          <div className="flex gap-2 sm:col-span-2"><button type="submit" className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700">Save Season</button><button type="button" onClick={() => setIsAdding(false)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600">Cancel</button></div>
        </form>
      )}

      {!isAdding && seasons.length < seasonLimit && <button type="button" onClick={() => { setMessage(""); setIsAdding(true); }} className="mt-4 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 font-bold text-indigo-700 transition hover:bg-indigo-50">＋ Add a Study Season</button>}
      {message && <p role="status" className="mt-3 text-sm text-slate-600">{message}</p>}
      <p className="mt-3 text-center text-xs text-slate-400">Saved on this device</p>
    </section>
  );
}
