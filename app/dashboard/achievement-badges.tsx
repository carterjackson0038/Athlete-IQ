type AchievementBadgesProps = {
  xp: number;
};

const badges = [
  { title: "First Rep", description: "Earn your first 25 XP", threshold: 25, icon: "⚡" },
  { title: "Momentum", description: "Build up to 100 XP", threshold: 100, icon: "🔥" },
  { title: "Level Up", description: "Reach 500 XP", threshold: 500, icon: "🏆" },
];

export default function AchievementBadges({ xp }: AchievementBadgesProps) {
  const nextBadge = badges.find((badge) => xp < badge.threshold);
  const previousThreshold = nextBadge ? badges[badges.indexOf(nextBadge) - 1]?.threshold ?? 0 : 0;
  const progress = nextBadge
    ? Math.min(100, Math.round(((xp - previousThreshold) / (nextBadge.threshold - previousThreshold)) * 100))
    : 100;
  const earnedCount = badges.filter((badge) => xp >= badge.threshold).length;

  return (
    <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="badges-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-600">MILESTONES</p>
          <h2 id="badges-title" className="mt-1 text-xl font-extrabold">Your Badges</h2>
          <p className="mt-1 text-sm text-slate-500">Every study rep adds XP and brings the next badge closer.</p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">{earnedCount} / {badges.length} earned</span>
      </div>

      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {badges.map((badge) => {
          const earned = xp >= badge.threshold;
          return (
            <li key={badge.title} aria-label={`${badge.title}: ${earned ? "earned" : "locked"}`} className={`flex items-center gap-3 rounded-2xl border p-3 ${earned ? "border-amber-200 bg-amber-50" : "border-slate-100 bg-slate-50"}`}>
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl ${earned ? "bg-white shadow-sm" : "bg-slate-200 grayscale"}`} aria-hidden="true">{badge.icon}</span>
              <div className="min-w-0">
                <p className={`font-bold ${earned ? "text-slate-900" : "text-slate-500"}`}>{badge.title}</p>
                <p className="text-xs text-slate-500">{earned ? "Earned" : badge.description}</p>
              </div>
            </li>
          );
        })}
      </ul>

      {nextBadge ? (
        <div className="mt-4">
          <div className="flex justify-between gap-3 text-xs font-semibold text-slate-500"><span>Next up: {nextBadge.title}</span><span>{Math.max(0, nextBadge.threshold - xp)} XP to go</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`Progress to ${nextBadge.title}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${progress}%` }} /></div>
        </div>
      ) : <p className="mt-4 text-sm font-semibold text-amber-700">All current badges earned. Keep training for the next set!</p>}
    </section>
  );
}
