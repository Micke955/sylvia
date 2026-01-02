import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ProfileSettings from "@/components/ProfileSettings";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="soft-card rounded-3xl p-8 text-center">
        <h1 className="section-title text-2xl font-semibold">Profil</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Connectez-vous pour acceder a vos parametres.
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Link href="/login" className="btn-primary">
            Connexion
          </Link>
          <Link href="/signup" className="btn-secondary">
            Inscription
          </Link>
        </div>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url, is_public_library, is_public_wishlist")
    .eq("id", user.id)
    .maybeSingle();

  const { data: libraryItems } = await supabase
    .from("user_books")
    .select(
      "reading_started_at, reading_finished_at, pages_total, pages_read, reading_status, books(categories)",
    )
    .eq("user_id", user.id)
    .eq("in_library", true);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const { data: goal } = await supabase
    .from("user_goals")
    .select("target_books, target_pages")
    .eq("user_id", user.id)
    .eq("year", currentYear)
    .eq("month", currentMonth)
    .maybeSingle();

  const finishedDates = (libraryItems ?? [])
    .map((item) => item.reading_finished_at)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()));

  const finishedCount = finishedDates.length;
  const finishedDateKeys = Array.from(
    new Set(
      finishedDates.map((date) => date.toISOString().slice(0, 10)),
    ),
  ).sort((a, b) => b.localeCompare(a));

  const computeStreak = () => {
    if (!finishedDateKeys.length) return 0;
    const toDate = (key: string) => new Date(`${key}T00:00:00`);
    let streak = 1;
    let cursor = toDate(finishedDateKeys[0]);
    for (let i = 1; i < finishedDateKeys.length; i += 1) {
      const next = toDate(finishedDateKeys[i]);
      const diffDays = Math.round(
        (cursor.getTime() - next.getTime()) / 86400000,
      );
      if (diffDays === 1) {
        streak += 1;
        cursor = next;
      } else if (diffDays > 1) {
        break;
      }
    }
    return streak;
  };

  const streakDays = computeStreak();
  const monthKey = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
  const finishedThisMonth = finishedDates.filter((date) =>
    date.toISOString().startsWith(monthKey),
  );
  const pagesThisMonth = (libraryItems ?? [])
    .filter((item) => item.reading_finished_at?.startsWith(monthKey))
    .reduce((acc, item) => acc + (item.pages_read ?? item.pages_total ?? 0), 0);

  const targetBooks = goal?.target_books ?? null;
  const targetPages = goal?.target_pages ?? null;
  const goalReached =
    (targetBooks && finishedThisMonth.length >= targetBooks) ||
    (targetPages && pagesThisMonth >= targetPages);

  const levels = [
    { name: "Bronze", min: 0, max: 4 },
    { name: "Argent", min: 5, max: 14 },
    { name: "Or", min: 15, max: 29 },
    { name: "Platine", min: 30, max: 9999 },
  ];
  const currentLevel =
    levels.find((level) => finishedCount >= level.min && finishedCount <= level.max) ??
    levels[0];
  const nextLevel =
    levels.find((level) => level.min > currentLevel.min) ?? null;
  const nextLevelTarget = nextLevel ? nextLevel.min : null;

  const badges = [
    { label: "Premier livre", achieved: finishedCount >= 1 },
    { label: "5 livres", achieved: finishedCount >= 5 },
    { label: "10 livres", achieved: finishedCount >= 10 },
    { label: "25 livres", achieved: finishedCount >= 25 },
    { label: "50 livres", achieved: finishedCount >= 50 },
    { label: "Streak 7 jours", achieved: streakDays >= 7 },
    { label: "Streak 14 jours", achieved: streakDays >= 14 },
    { label: "Objectif mensuel", achieved: Boolean(goalReached) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title text-3xl font-semibold">Profil</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Gerez votre visibilite et personnalisez votre profil public.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="soft-card rounded-3xl p-6 space-y-4">
          <div>
            <h2 className="section-title text-2xl font-semibold">Recompenses</h2>
            <p className="text-sm text-[var(--text-muted)]">
              Suivez votre progression et debloquez des badges.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/30 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Niveau lecteur
            </p>
            <div className="mt-3 flex items-center justify-between">
              <span className="section-title text-xl font-semibold">
                {currentLevel.name}
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                {finishedCount} livres termines
              </span>
            </div>
            {nextLevelTarget ? (
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Prochain niveau dans {nextLevelTarget - finishedCount} livre(s).
              </p>
            ) : (
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Niveau maximum atteint.
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/30 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Streak actuel
            </p>
            <p className="mt-3 text-2xl font-semibold text-[var(--text)]">
              {streakDays} jour{streakDays > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Continuez a lire pour conserver votre serie.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/30 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Badges debloques
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {badges.map((badge) => (
                <span
                  key={badge.label}
                  className={
                    badge.achieved
                      ? "pill text-[10px] uppercase tracking-[0.15em]"
                      : "rounded-full border border-dashed border-[var(--border)] px-3 py-1 text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)]"
                  }
                >
                  {badge.label}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="soft-card rounded-3xl p-6">
          <ProfileSettings
            userId={user.id}
            username={profile?.username ?? null}
            avatarUrl={profile?.avatar_url ?? null}
            isPublicLibrary={profile?.is_public_library ?? false}
            isPublicWishlist={profile?.is_public_wishlist ?? false}
          />
        </div>
      </div>
    </div>
  );
}
