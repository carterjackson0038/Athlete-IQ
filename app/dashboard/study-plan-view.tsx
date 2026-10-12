"use client";

import { useState } from "react";
import type { StudyPlan } from "@/lib/study-plan";

type StudyPlanViewProps = {
  plan: StudyPlan;
  totalMinutes: number;
};

export default function StudyPlanView({ plan, totalMinutes }: StudyPlanViewProps) {
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());

  function toggleAnswer(id: string) {
    setRevealed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <article className="mt-5 overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-sm">
      <header className="bg-gradient-to-r from-indigo-700 to-violet-700 px-5 py-5 text-white sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-indigo-100">YOUR GAME PLAN</p>
          <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold">{totalMinutes} minutes</span>
        </div>
        <h3 className="mt-2 text-2xl font-black leading-tight">{plan.title}</h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-indigo-100">{plan.overview}</p>
      </header>

      <div className="space-y-6 p-5 sm:p-6">
        <section aria-labelledby="plan-steps-heading">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 id="plan-steps-heading" className="font-extrabold text-slate-900">Session steps</h4>
            <span className="text-xs font-semibold text-slate-500">{plan.steps.reduce((sum, step) => sum + step.minutes, 0)} min total</span>
          </div>
          <ol className="space-y-3">
            {plan.steps.map((step, index) => (
              <li key={`${step.title}-${index}`} className="flex gap-3 rounded-2xl bg-slate-50 p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-100 text-sm font-black text-indigo-700">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2"><h5 className="font-bold text-slate-900">{step.title}</h5><span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-indigo-700">{step.minutes} min</span></div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {plan.practiceProblems.length > 0 && <section aria-labelledby="practice-heading">
          <h4 id="practice-heading" className="mb-3 font-extrabold text-slate-900">Practice problems</h4>
          <ol className="space-y-3">{plan.practiceProblems.map((problem, index) => {
            const id = `problem-${index}`;
            const show = revealed.has(id);
            return <li key={id} className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
              <p className="text-sm font-semibold leading-6 text-slate-800"><span className="mr-2 font-black text-emerald-700">{index + 1}.</span>{problem.question}</p>
              {problem.answer && <div className="mt-3"><button type="button" onClick={() => toggleAnswer(id)} aria-expanded={show} className="text-sm font-bold text-emerald-800 underline underline-offset-2">{show ? "Hide answer" : "Show answer"}</button>{show && <div className="mt-2 rounded-xl bg-white p-3 text-sm leading-6 text-slate-700"><p><strong>Answer:</strong> {problem.answer}</p>{problem.explanation && <p className="mt-1"><strong>Why:</strong> {problem.explanation}</p>}</div>}</div>}
            </li>;
          })}</ol>
        </section>}

        {plan.quiz.length > 0 && <section aria-labelledby="quiz-heading">
          <h4 id="quiz-heading" className="mb-3 font-extrabold text-slate-900">Quick quiz</h4>
          <ol className="space-y-3">{plan.quiz.map((item, index) => {
            const id = `quiz-${index}`;
            const show = revealed.has(id);
            return <li key={id} className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4"><p className="text-sm font-semibold leading-6 text-slate-800"><span className="mr-2 font-black text-sky-700">{index + 1}.</span>{item.question}</p><button type="button" onClick={() => toggleAnswer(id)} aria-expanded={show} className="mt-3 text-sm font-bold text-sky-800 underline underline-offset-2">{show ? "Hide answer" : "Show answer"}</button>{show && <p className="mt-2 rounded-xl bg-white p-3 text-sm leading-6 text-slate-700"><strong>Answer:</strong> {item.answer}</p>}</li>;
          })}</ol>
        </section>}

        {plan.flashcards.length > 0 && <section aria-labelledby="flashcards-heading">
          <h4 id="flashcards-heading" className="mb-3 font-extrabold text-slate-900">Flashcards</h4>
          <div className="grid gap-3 sm:grid-cols-2">{plan.flashcards.map((card, index) => {
            const id = `flashcard-${index}`;
            const show = revealed.has(id);
            return <button key={id} type="button" onClick={() => toggleAnswer(id)} aria-expanded={show} className="min-h-28 rounded-2xl border border-violet-100 bg-violet-50 p-4 text-left transition hover:border-violet-300">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-violet-700">{show ? "Answer" : "Tap to reveal"}</span>
              <span className="mt-2 block text-sm font-semibold leading-6 text-slate-800">{show ? card.back : card.front}</span>
            </button>;
          })}</div>
        </section>}

        <aside className="rounded-2xl border border-amber-200 bg-amber-50 p-4" aria-label="Coach tip">
          <p className="text-xs font-extrabold uppercase tracking-wider text-amber-800">COACH TIP</p>
          <p className="mt-1 text-sm font-medium leading-6 text-amber-950">{plan.coachTip}</p>
        </aside>
      </div>
    </article>
  );
}
