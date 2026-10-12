# Architecture

AthleteIQ is a Next.js and TypeScript application styled with Tailwind CSS. Supabase Auth and the existing `profiles` table support accounts, onboarding, and XP. The dashboard stores assignments, Study Seasons, and daily mission markers in account-scoped browser storage. Notes, PDFs, and images are saved in IndexedDB in the current browser and can be downloaded or removed there.

Study plans are generated through a server-side Next.js route. The route validates the signed-in Supabase user, applies a small per-user request cap, and calls Gemini using the server-only `GEMINI_API_KEY`. It always sends the study subject, goal, and available minutes; file contents are added only when the user selects specific files and submits a plan. Text notes are sent as text, while selected PDFs and images are sent as inline file data. When the AI service is not configured or unavailable, the dashboard falls back to its local study-plan builder, which does not use uploaded files.

No database schema changes are part of the current MVP work. Cross-device sync and production operations remain future work. Friends and leaderboards are outside the current scope.
