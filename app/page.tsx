import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-6xl font-bold">AthleteIQ</h1>

      <p className="mt-4 text-xl">
        Train for exams like athletes train for games.
      </p>

      <Link href="/signup">
        <button className="mt-8 rounded-lg bg-black px-6 py-3 text-white">
          Get Started
        </button>
      </Link>

      <Link href="/dashboard" className="mt-4 text-sm font-semibold text-gray-600 underline underline-offset-4">
        Preview your dashboard
      </Link>

      <p className="mt-4 text-sm text-gray-600">
        Already have an account? <Link href="/login" className="font-semibold text-indigo-700 underline">Log in</Link>
      </p>
    </main>
  );
}
