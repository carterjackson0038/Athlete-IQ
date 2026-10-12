"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { parseStudyPlan, type StudyPlan } from "@/lib/study-plan";
import AchievementBadges from "./achievement-badges";
import StudyPlanView from "./study-plan-view";
import StudyMaterials, { type StudyPromptAttachment } from "./study-materials";
import StudySeasons from "./study-seasons";

type Profile = {
  username: string | null;
  sport: string | null;
  xp: number | null;
};

type Assignment = {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
};

type StudyExtras = {
  practiceProblems: boolean;
  answerKey: boolean;
  quickQuiz: boolean;
  flashcards: boolean;
};

const defaultStudyExtras: StudyExtras = {
  practiceProblems: false,
  answerKey: false,
  quickQuiz: false,
  flashcards: false,
};

const assignmentsStoragePrefix = "athleteiq.assignments.v1";
const legacyAssignmentsStorageKey = "athleteiq.assignments.v1";
const preferencesStoragePrefix = "athleteiq.studyPreferences.v1.";

const missions = [
  { title: "Review your notes", detail: "Build your game plan for today", xp: 25 },
  { title: "Complete a focus session", detail: "One focused sprint moves you forward", xp: 50 },
];

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentsStorageKey, setAssignmentsStorageKey] = useState(`${assignmentsStoragePrefix}.guest`);
  const [isAddingAssignment, setIsAddingAssignment] = useState(false);
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentSubject, setAssignmentSubject] = useState("");
  const [assignmentDueDate, setAssignmentDueDate] = useState("");
  const [completedMissions, setCompletedMissions] = useState<string[]>([]);
  const [missionMessage, setMissionMessage] = useState("");
  const [studySubject, setStudySubject] = useState("");
  const [studyGoal, setStudyGoal] = useState("");
  const [studyMinutes, setStudyMinutes] = useState(30);
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [studyAttachments, setStudyAttachments] = useState<StudyPromptAttachment[]>([]);
  const [studyExtras, setStudyExtras] = useState<StudyExtras>(defaultStudyExtras);
  const [studyPlanMessage, setStudyPlanMessage] = useState("");
  const [isGeneratingStudyPlan, setIsGeneratingStudyPlan] = useState(false);
  const [focusSeconds, setFocusSeconds] = useState(25 * 60);
  const [focusRunning, setFocusRunning] = useState(false);
  const [focusStarted, setFocusStarted] = useState(false);
  const focusAwarded = useRef(false);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (active) {
          setIsAuthenticated(false);
          setLoading(false);
        }
        return;
      }

      if (active) setIsAuthenticated(true);

      const { data } = await supabase
        .from("profiles")
        .select("username, sport, xp")
        .eq("id", user.id)
        .maybeSingle();

      if (active) {
        const completionKey = `athleteiq.missions.${user.id}.${new Date().toLocaleDateString("en-CA")}`;
        try {
          const savedCompletions = window.localStorage.getItem(completionKey);
          if (savedCompletions) {
            const parsed: unknown = JSON.parse(savedCompletions);
            if (Array.isArray(parsed)) {
              window.setTimeout(() => {
                if (active) setCompletedMissions(parsed.filter((item): item is string => typeof item === "string"));
              }, 0);
            }
          }
        } catch {
          // Mission completion still works for this session if storage is unavailable.
        }
      }

      if (active) {
        setProfile(data);
        setLoading(false);
      }
    }

    void loadProfile();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!focusRunning) return;
    const interval = window.setInterval(() => {
      setFocusSeconds((remaining) => Math.max(0, remaining - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [focusRunning]);

  useEffect(() => {
    if (focusSeconds !== 0) return;
    const stopTimer = window.setTimeout(() => setFocusRunning(false), 0);
    if (focusStarted && !focusAwarded.current && !completedMissions.includes(missions[1].title)) {
      focusAwarded.current = true;
      void completeMission(missions[1]);
    }
    return () => window.clearTimeout(stopTimer);
  // A finished session awards once, even if the profile update changes component state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSeconds, focusStarted, completedMissions]);

  useEffect(() => {
    let active = true;
    async function loadStudyPreferences() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active || !user) return;
      try {
        const saved = window.localStorage.getItem(`${preferencesStoragePrefix}${user.id}`);
        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          if (parsed && typeof parsed === "object") {
            const preferences = parsed as { subject?: unknown; mission?: unknown };
            if (typeof preferences.subject === "string") window.setTimeout(() => active && setStudySubject(preferences.subject as string), 0);
            if (typeof preferences.mission === "string") window.setTimeout(() => active && setStudyGoal(preferences.mission as string), 0);
          }
        }
      } catch {
        // Study preferences are optional.
      }
    }
    void loadStudyPreferences();
    return () => { active = false; };
  }, []);

  async function completeMission(mission: (typeof missions)[number]) {
    if (completedMissions.includes(mission.title)) return;
    setMissionMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !profile) {
      setMissionMessage("Log in to save your progress and earn XP.");
      return;
    }

    const updatedXp = Math.max(0, profile.xp ?? 0) + mission.xp;
    const { error } = await supabase.from("profiles").update({ xp: updatedXp }).eq("id", user.id);
    if (error) {
      setMissionMessage("We couldn't save your XP. Please try again.");
      return;
    }

    const nextCompleted = [...completedMissions, mission.title];
    setProfile({ ...profile, xp: updatedXp });
    setCompletedMissions(nextCompleted);
    setMissionMessage(`Nice work! +${mission.xp} XP added to your profile.`);
    const completionKey = `athleteiq.missions.${user.id}.${new Date().toLocaleDateString("en-CA")}`;
    try {
      window.localStorage.setItem(completionKey, JSON.stringify(nextCompleted));
    } catch {
      // XP has already been saved in the profile.
    }
  }

  async function buildStudyPlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const subject = studySubject.trim();
    const goal = studyGoal.trim();
    setIsGeneratingStudyPlan(true);
    setStudyPlanMessage("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/study-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ subject, goal, minutes: studyMinutes, attachments: studyAttachments, options: studyExtras }),
      });
      if (response.status === 401) throw new Error("Sign in to use Gemini.");
      if (response.status === 429) throw new Error("Please wait a minute before creating another AI plan.");
      if (response.status === 503) throw new Error("Gemini isn’t configured on the server yet.");
      if (!response.ok) throw new Error("Gemini is unavailable right now.");
      const result: unknown = await response.json();
      if (!result || typeof result !== "object" || !("plan" in result)) {
        throw new Error("Invalid study plan response");
      }
      const parsedPlan = parseStudyPlan(result.plan);
      if (!parsedPlan) throw new Error("Gemini returned an invalid study plan.");
      setStudyPlan(parsedPlan);
      setStudyPlanMessage(studyAttachments.length
        ? `Created with Gemini using ${studyAttachments.length} selected file${studyAttachments.length === 1 ? "" : "s"}.`
        : "Created with Gemini. Only your subject, goal, and study time were sent.");
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Gemini is unavailable right now.";
      setStudyPlanMessage(`${reason} Here’s your on-device plan instead.${studyAttachments.length ? " The local plan doesn’t use uploaded files." : ""}`);
      setStudyPlan(makeLocalStudyPlan(subject, goal, studyMinutes));
    } finally {
      setIsGeneratingStudyPlan(false);
    }
  }

  function makeLocalStudyPlan(subject: string, goal: string, studyMinutes: number): StudyPlan {
    const warmupMinutes = Math.max(2, Math.round(studyMinutes * 0.2));
    const practiceMinutes = Math.max(2, Math.round(studyMinutes * 0.6));
    const reviewMinutes = studyMinutes - warmupMinutes - practiceMinutes;
    const subjectLower = subject.toLowerCase();
    const practice = /math|algebra|calculus|geometry|statistics/.test(subjectLower)
      ? "Work through a few problems without looking at the worked examples. Show each step, then check your method."
      : /biology|chemistry|physics|science/.test(subjectLower)
        ? "Draw or explain the process from memory, then use your notes to correct the parts you missed."
        : /history|government|social studies/.test(subjectLower)
          ? "Build a short timeline or cause-and-effect chain, then support the main idea with two facts."
          : /english|literature|writing|language/.test(subjectLower)
            ? "Write a short explanation or response from memory, then check it for a clear claim and supporting details."
            : "Study one small section, close your materials, and explain its key ideas in your own words.";

    return {
      title: `${subject} study session`,
      overview: `Today’s target: ${goal}`,
      steps: [
        { title: "Warm up", minutes: warmupMinutes, detail: "Before opening your notes, write what you already know and one question you want answered." },
        { title: "Focused practice", minutes: practiceMinutes, detail: practice },
        { title: "Review and wrap up", minutes: reviewMinutes, detail: "Explain the most important idea from memory, check your notes, and write down one thing to review next time." },
      ],
      practiceProblems: [],
      quiz: [],
      flashcards: [],
      coachTip: studyMinutes < 20 ? "Keep the target small and finish with a quick recall check." : "Take a short reset if your focus dips, then return to the exact goal.",
    };
  }

  function resetFocusSession() {
    setFocusRunning(false);
    setFocusStarted(false);
    setFocusSeconds(25 * 60);
    focusAwarded.current = false;
  }

  const focusTime = `${Math.floor(focusSeconds / 60).toString().padStart(2, "0")}:${(focusSeconds % 60).toString().padStart(2, "0")}`;

  async function logOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setMissionMessage("Couldn't log out right now. Please try again.");
      return;
    }
    setIsAuthenticated(false);
    setProfile(null);
    setAssignments([]);
    setAssignmentsStorageKey(`${assignmentsStoragePrefix}.guest`);
  }

  useEffect(() => {
    let active = true;
    async function loadAssignments() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      const storageKey = user ? `${assignmentsStoragePrefix}.${user.id}` : `${assignmentsStoragePrefix}.guest`;
      setAssignmentsStorageKey(storageKey);
      try {
        let savedAssignments = window.localStorage.getItem(storageKey);
        if (user && !savedAssignments) {
          savedAssignments = window.localStorage.getItem(legacyAssignmentsStorageKey);
          if (savedAssignments) {
            window.localStorage.setItem(storageKey, savedAssignments);
            window.localStorage.removeItem(legacyAssignmentsStorageKey);
          }
        }
        if (savedAssignments) {
          const parsed: unknown = JSON.parse(savedAssignments);
          if (Array.isArray(parsed)) {
            window.setTimeout(() => {
              if (active) setAssignments(parsed as Assignment[]);
            }, 0);
          }
        }
      } catch {
        // Keep the dashboard usable if browser storage is unavailable or invalid.
      }
    }
    void loadAssignments();
    return () => { active = false; };
  }, []);

  function addAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextAssignments = [...assignments, {
      id: crypto.randomUUID(),
      title: assignmentTitle.trim(),
      subject: assignmentSubject.trim(),
      dueDate: assignmentDueDate,
    }];
    setAssignments(nextAssignments);
    try {
      window.localStorage.setItem(assignmentsStorageKey, JSON.stringify(nextAssignments));
    } catch {
      // The assignment remains visible for this visit even if storage is blocked.
    }
    setAssignmentTitle("");
    setAssignmentSubject("");
    setAssignmentDueDate("");
    setIsAddingAssignment(false);
  }

  function removeAssignment(id: string) {
    const nextAssignments = assignments.filter((assignment) => assignment.id !== id);
    setAssignments(nextAssignments);
    try {
      window.localStorage.setItem(assignmentsStorageKey, JSON.stringify(nextAssignments));
    } catch {
      // The assignment remains removed for this visit even if storage is blocked.
    }
  }

  const xp = Math.max(0, profile?.xp ?? 0);
  const level = Math.floor(xp / 500) + 1;
  const levelProgress = xp % 500;

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-5 text-slate-900 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-7 flex items-center justify-between">
          <Link href="/" className="text-lg font-black tracking-tight text-indigo-700">AthleteIQ<span className="text-amber-500">.</span></Link>
          {isAuthenticated ? <button type="button" onClick={() => void logOut()} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">Log out</button> : <Link href="/login" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">Log in</Link>}
        </header>

        <section className="mb-5 rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-700 to-violet-800 p-6 text-white shadow-lg shadow-indigo-200 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-indigo-200">YOUR TRAINING HQ</p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">{loading ? "Welcome back" : `Hey, ${profile?.username || "Athlete"}!`}</h1>
              <p className="mt-2 text-indigo-100">{profile?.sport ? `${profile.sport} season · ` : "Your next great session starts here · "}Ready to get in the zone?</p>
            </div>
            <div className="min-w-48 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <div className="flex items-center justify-between text-sm"><span className="font-bold">LEVEL {level}</span><span className="text-indigo-100">🏆 {xp} XP</span></div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-indigo-950/40"><div className="h-full rounded-full bg-amber-300 transition-all" style={{ width: `${(levelProgress / 500) * 100}%` }} /></div>
              <p className="mt-2 text-xs text-indigo-100">{500 - levelProgress} XP to Level {level + 1}</p>
            </div>
          </div>
        </section>

        <AchievementBadges xp={xp} />

        <section className="mb-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div><p className="text-xs font-bold uppercase tracking-wider text-indigo-600">TODAY&apos;S MISSION</p><h2 className="mt-1 text-xl font-extrabold">Win the day, one rep at a time</h2></div>
              <span className="text-2xl" aria-hidden="true">⚡</span>
            </div>
            <div className="space-y-3">
              {missions.map((mission, index) => {
                const isComplete = completedMissions.includes(mission.title);
                return <div key={mission.title} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-100 text-sm font-black text-indigo-700">{isComplete ? "✓" : index + 1}</span>
                  <div className="min-w-0 flex-1"><p className="font-bold">{mission.title}</p><p className="text-sm text-slate-500">{mission.detail}</p></div>
                  {index === 1 && !isComplete ? <div className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-xs font-bold tabular-nums text-slate-700">{focusTime}</span>
                    <button type="button" onClick={() => { setFocusStarted(true); setFocusRunning(!focusRunning); }} className="rounded-full bg-white px-3 py-2 text-xs font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-50">{focusRunning ? "Pause" : focusStarted ? "Resume" : "Start"}</button>
                    {focusStarted && <button type="button" onClick={resetFocusSession} aria-label="Reset focus session" className="rounded-full bg-white px-2 py-2 text-xs font-bold text-slate-500 shadow-sm hover:text-slate-800">↻</button>}
                  </div> : <button type="button" disabled={isComplete} onClick={() => void completeMission(mission)} className="shrink-0 rounded-full bg-white px-3 py-2 text-xs font-bold text-amber-700 shadow-sm transition hover:bg-amber-50 disabled:bg-emerald-50 disabled:text-emerald-700">{isComplete ? "Done" : `+${mission.xp} XP`}</button>}
                </div>;
              })}
            </div>
            {missionMessage && <p role="status" className="mt-3 text-sm font-medium text-indigo-700">{missionMessage} {!profile && <Link href="/login" className="underline">Log in</Link>}</p>}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-indigo-600">YOUR ASSIGNMENTS</p><h2 className="mt-1 text-xl font-extrabold">{assignments.length ? `${assignments.length} on your list` : "Ready when you are"}</h2></div><span className="text-2xl" aria-hidden="true">📋</span></div>
            {assignments.length === 0 ? <p className="mt-4 text-sm leading-6 text-slate-500">Keep your schoolwork in one place and turn every finished task into progress.</p> : <ul className="mt-4 space-y-2">
              {assignments.map((assignment) => <li key={assignment.id} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                <span className="mt-0.5 text-indigo-600" aria-hidden="true">○</span>
                <div className="min-w-0 flex-1"><p className="break-words text-sm font-bold">{assignment.title}</p><p className="text-xs text-slate-500">{[assignment.subject, assignment.dueDate ? `Due ${new Date(`${assignment.dueDate}T00:00:00`).toLocaleDateString()}` : ""].filter(Boolean).join(" · ")}</p></div>
                <button type="button" onClick={() => removeAssignment(assignment.id)} aria-label={`Remove ${assignment.title}`} className="px-1 text-lg leading-none text-slate-400 hover:text-rose-600">×</button>
              </li>)}
            </ul>}
            <button type="button" onClick={() => setIsAddingAssignment(true)} className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white shadow-sm transition hover:bg-indigo-700">＋ Add Assignment</button>
            <p className="mt-2 text-center text-xs text-slate-400">Saved on this device</p>
          </div>
        </section>

        <StudySeasons />

        <StudyMaterials onSelectedForAIChange={setStudyAttachments} />

        <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5"><p className="text-xs font-bold uppercase tracking-wider text-indigo-600">YOUR COACH&apos;S GAME PLAN</p><h2 className="mt-1 text-xl font-extrabold">Build a study plan</h2><p className="mt-1 text-sm text-slate-500">Set a goal, choose a session length, and add extra practice if you want it.</p></div>
          <form onSubmit={buildStudyPlan} className="grid gap-3 sm:grid-cols-[1fr_1.4fr_120px_auto] sm:items-end">
            <label className="text-sm font-semibold">Subject<input required maxLength={80} value={studySubject} onChange={(event) => setStudySubject(event.target.value)} placeholder="Biology" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label>
            <label className="text-sm font-semibold">Today&apos;s goal<input required maxLength={240} value={studyGoal} onChange={(event) => setStudyGoal(event.target.value)} placeholder="Review cell structure" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label>
            <label className="text-sm font-semibold">Minutes<input type="number" required min={10} max={120} step={5} value={studyMinutes} onChange={(event) => setStudyMinutes(Number(event.target.value))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
            <fieldset className="rounded-2xl border border-slate-200 p-4 sm:col-span-4">
              <legend className="px-1 text-sm font-bold text-slate-800">Want the AI to add anything else?</legend>
              <p className="mb-3 text-xs leading-5 text-slate-500">Choose any extras. Answers stay hidden until opened.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><input type="checkbox" checked={studyExtras.practiceProblems} onChange={(event) => setStudyExtras((current) => ({ ...current, practiceProblems: event.target.checked, answerKey: event.target.checked && current.answerKey }))} className="mt-1 accent-indigo-600" /><span><strong className="block">Practice problems</strong><span className="text-xs text-slate-500">Get a few questions to work through.</span></span></label>
                <label className={`flex items-start gap-2 rounded-xl p-3 text-sm ${studyExtras.practiceProblems ? "bg-slate-50 text-slate-700" : "bg-slate-50/60 text-slate-400"}`}><input type="checkbox" checked={studyExtras.answerKey} disabled={!studyExtras.practiceProblems} onChange={(event) => setStudyExtras((current) => ({ ...current, answerKey: event.target.checked }))} className="mt-1 accent-indigo-600" /><span><strong className="block">Answer key and explanations</strong><span className="text-xs text-slate-500">Reveal solutions when you’re ready.</span></span></label>
                <label className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><input type="checkbox" checked={studyExtras.quickQuiz} onChange={(event) => setStudyExtras((current) => ({ ...current, quickQuiz: event.target.checked }))} className="mt-1 accent-indigo-600" /><span><strong className="block">Quick quiz</strong><span className="text-xs text-slate-500">Check what you remember.</span></span></label>
                <label className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><input type="checkbox" checked={studyExtras.flashcards} onChange={(event) => setStudyExtras((current) => ({ ...current, flashcards: event.target.checked }))} className="mt-1 accent-indigo-600" /><span><strong className="block">Flashcards</strong><span className="text-xs text-slate-500">Review key terms and ideas.</span></span></label>
              </div>
            </fieldset>
            <button type="submit" disabled={isGeneratingStudyPlan} className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-700 disabled:opacity-60 sm:col-span-4">{isGeneratingStudyPlan ? "Building your plan…" : "Build my study plan"}</button>
          </form>
          <p className="mt-3 text-xs leading-5 text-slate-500">Gemini receives your subject, goal, study time, selected extras, and only the files you chose above. Your name and account details stay out of the request.</p>
          {studyPlanMessage && <p role="status" className="mt-3 text-sm text-slate-600">{studyPlanMessage}</p>}
          {studyPlan && <StudyPlanView plan={studyPlan} totalMinutes={studyPlan.steps.reduce((sum, step) => sum + step.minutes, 0)} />}
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-indigo-600">PICK YOUR PLAY</p><h2 className="mt-1 text-xl font-extrabold">Game Modes</h2></div><span className="text-sm text-slate-500">Choose your next challenge</span></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <article className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-100 p-5 sm:p-6">
              <div className="flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-2xl shadow-sm">🏈</span><span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-extrabold text-amber-900">COMING UP</span></div>
              <h3 className="mt-4 text-xl font-black">Clutch Mode</h3><p className="mt-1 text-sm leading-6 text-amber-950/70">The clock is ticking. Practice staying focused and making your next move under pressure.</p>
              <button type="button" disabled className="mt-4 rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-bold text-white opacity-75">Clutch Mode · Coming soon</button>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-2xl">🎯</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-500">IN TRAINING</span></div>
              <h3 className="mt-4 text-xl font-black">Focus Session</h3><p className="mt-1 text-sm leading-6 text-slate-500">Set a goal, lock in, and build momentum with a focused study sprint.</p>
              <button type="button" disabled className="mt-4 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-500">More modes coming soon</button>
            </article>
          </div>
        </section>

        {!loading && !profile && <p className="mt-6 text-center text-sm text-slate-500">Create an account to save your profile and XP. <Link className="font-bold text-indigo-700 underline" href="/signup">Get started</Link></p>}
      </div>

      {isAddingAssignment && <div className="fixed inset-0 z-10 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4" onClick={() => setIsAddingAssignment(false)}>
        <section role="dialog" aria-modal="true" aria-labelledby="assignment-dialog-title" className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl" onClick={(event) => event.stopPropagation()}>
          <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-indigo-600">NEW REP</p><h2 id="assignment-dialog-title" className="mt-1 text-2xl font-black">Add assignment</h2></div><button type="button" onClick={() => setIsAddingAssignment(false)} aria-label="Close" className="rounded-full bg-slate-100 px-3 py-1 text-xl text-slate-500">×</button></div>
          <form onSubmit={addAssignment} className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700">Assignment name<input autoFocus required maxLength={100} value={assignmentTitle} onChange={(event) => setAssignmentTitle(event.target.value)} placeholder="e.g. Biology lab report" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label>
            <label className="block text-sm font-semibold text-slate-700">Subject <span className="font-normal text-slate-400">(optional)</span><input maxLength={60} value={assignmentSubject} onChange={(event) => setAssignmentSubject(event.target.value)} placeholder="e.g. Biology" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label>
            <label className="block text-sm font-semibold text-slate-700">Due date <span className="font-normal text-slate-400">(optional)</span><input type="date" value={assignmentDueDate} onChange={(event) => setAssignmentDueDate(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label>
            <button type="submit" className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white hover:bg-indigo-700">Save assignment</button>
          </form>
        </section>
      </div>}
    </main>
  );
}
