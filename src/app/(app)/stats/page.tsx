import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { LibraryItem } from "@/components/LibraryClient";
import StatsExports from "@/components/StatsExports";
import ReadingTimeline from "@/components/ReadingTimeline";
import MonthlyGoalClient from "@/components/MonthlyGoalClient";

function computeStats(items: LibraryItem[]) {
  const total = items.length;
  const toRead = items.filter((item) => item.reading_status === "to_read").length;
  const reading = items.filter((item) => item.reading_status === "reading").length;
  const finished = items.filter((item) => item.reading_status === "finished").length;
  const ratings = items
    .map((item) => item.rating)
    .filter((rating): rating is number => typeof rating === "number");
  const avgRating =
    ratings.length > 0
      ? (ratings.reduce((acc, value) => acc + (value ?? 0), 0) / ratings.length).toFixed(1)
      : "0";

  const speedSamples = items
    .filter(
      (item) =>
        item.reading_started_at &&
        item.reading_finished_at &&
        (item.pages_read || item.pages_total),
    )
    .map((item) => {
      const start = new Date(item.reading_started_at as string);
      const end = new Date(item.reading_finished_at as string);
      const days = Math.max(
        1,
        Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1,
      );
      const pages = item.pages_read ?? item.pages_total ?? 0;
      return pages / days;
    })
    .filter((value) => Number.isFinite(value));

  const avgSpeed =
    speedSamples.length > 0
      ? Math.round(
          speedSamples.reduce((acc, value) => acc + value, 0) / speedSamples.length,
        )
      : 0;

  return { total, toRead, reading, finished, avgRating, avgSpeed };
}

export default async function StatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="soft-card rounded-3xl p-8 text-center">
        <h1 className="section-title text-2xl font-semibold">Statistiques</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Connectez-vous pour voir vos statistiques.
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

  const { data: items } = await supabase
    .from("user_books")
    .select(
      "book_id, reading_status, reading_started_at, reading_finished_at, pages_total, pages_read, rating, added_at, books(title, authors, categories)",
    )
    .eq("user_id", user.id)
    .eq("in_library", true);

  const { data: wishlistRows } = await supabase
    .from("user_books")
    .select("book_id, added_at, books(title, authors)")
    .eq("user_id", user.id)
    .eq("in_wishlist", true)
    .order("added_at", { ascending: false });

  const toBook = (books: { title?: string; authors?: string[]; categories?: string[] }[] | { title?: string; authors?: string[]; categories?: string[] } | null) =>
    Array.isArray(books) ? books[0] : books;

  const stats = computeStats((items ?? []) as unknown as LibraryItem[]);

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

  const monthlyItems = (items ?? []).filter((item) => {
    const date =
      item.reading_finished_at ?? item.reading_started_at ?? item.added_at;
    if (!date) return false;
    const dt = new Date(date);
    return dt.getFullYear() === currentYear && dt.getMonth() + 1 === currentMonth;
  });

  const progressBooks = monthlyItems.filter(
    (item) => item.reading_status === "finished",
  ).length;
  const progressPages = monthlyItems.reduce(
    (acc, item) => acc + (item.pages_read ?? item.pages_total ?? 0),
    0,
  );

  const monthBuckets = (items ?? []).reduce<Record<string, number>>((acc, item) => {
    const date = item.reading_finished_at ?? item.reading_started_at ?? item.added_at;
    if (!date) return acc;
    const monthKey = new Date(date).toISOString().slice(0, 7);
    acc[monthKey] = (acc[monthKey] ?? 0) + 1;
    return acc;
  }, {});

  const monthSeries = Object.entries(monthBuckets)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, count]) => ({
      label: month,
      count,
    }));

  const pagesPerMonth = (items ?? []).reduce<Record<string, number>>((acc, item) => {
    const date = item.reading_finished_at ?? item.reading_started_at ?? item.added_at;
    if (!date) return acc;
    const pages = item.pages_read ?? item.pages_total ?? 0;
    if (!pages) return acc;
    const monthKey = new Date(date).toISOString().slice(0, 7);
    acc[monthKey] = (acc[monthKey] ?? 0) + pages;
    return acc;
  }, {});

  const pagesSeries = Object.entries(pagesPerMonth)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, pages]) => ({ label: month, pages }));

  const durationSamples = (items ?? [])
    .filter((item) => item.reading_started_at && item.reading_finished_at)
    .map((item) => {
      const start = new Date(item.reading_started_at as string);
      const end = new Date(item.reading_finished_at as string);
      return Math.max(
        1,
        Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
      );
    });

  const avgDuration =
    durationSamples.length > 0
      ? Math.round(
          durationSamples.reduce((acc, value) => acc + value, 0) /
            durationSamples.length,
        )
      : 0;

  const genreCount = (items ?? []).reduce<Record<string, number>>((acc, item) => {
    const book = toBook(item.books);
    const categories = book?.categories ?? [];
    categories.forEach((category: string) => {
      if (!category) return;
      acc[category] = (acc[category] ?? 0) + 1;
    });
    return acc;
  }, {});

  const topGenres = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const timelineItems = (items ?? []).map((item) => {
    const book = toBook(item.books);
    return {
      book_id: item.book_id,
      title: book?.title ?? "Titre",
      authors: book?.authors?.join(", ") ?? "",
      reading_status: item.reading_status ?? null,
      reading_started_at: item.reading_started_at ?? null,
      reading_finished_at: item.reading_finished_at ?? null,
      added_at: item.added_at ?? "",
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title text-3xl font-semibold">Statistiques</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Vue d'ensemble de vos lectures.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <div className="soft-card rounded-2xl p-4">
          <p className="text-xs text-[var(--text-muted)]">Total</p>
          <p className="section-title text-2xl font-semibold">{stats.total}</p>
        </div>
        <div className="soft-card rounded-2xl p-4">
          <p className="text-xs text-[var(--text-muted)]">A lire</p>
          <p className="section-title text-2xl font-semibold">{stats.toRead}</p>
        </div>
        <div className="soft-card rounded-2xl p-4">
          <p className="text-xs text-[var(--text-muted)]">En cours</p>
          <p className="section-title text-2xl font-semibold">{stats.reading}</p>
        </div>
        <div className="soft-card rounded-2xl p-4">
          <p className="text-xs text-[var(--text-muted)]">Lu</p>
          <p className="section-title text-2xl font-semibold">{stats.finished}</p>
        </div>
        <div className="soft-card rounded-2xl p-4 md:col-span-2">
          <p className="text-xs text-[var(--text-muted)]">Note moyenne</p>
          <p className="section-title text-2xl font-semibold">{stats.avgRating}/5</p>
        </div>
        <div className="soft-card rounded-2xl p-4 md:col-span-2">
          <p className="text-xs text-[var(--text-muted)]">Vitesse moyenne</p>
          <p className="section-title text-2xl font-semibold">
            {stats.avgSpeed} pages/jour
          </p>
        </div>
        <div className="soft-card rounded-2xl p-4 md:col-span-2">
          <p className="text-xs text-[var(--text-muted)]">Temps moyen</p>
          <p className="section-title text-2xl font-semibold">
            {avgDuration} jours/livre
          </p>
        </div>
        <div className="soft-card rounded-2xl p-4 md:col-span-4">
          <p className="text-xs text-[var(--text-muted)]">Wishlist</p>
          <p className="section-title text-2xl font-semibold">
            {(wishlistRows ?? []).length} livre(s)
          </p>
        </div>
        <div className="soft-card rounded-2xl p-4 md:col-span-4">
          <p className="text-xs text-[var(--text-muted)]">Genres preferes</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {topGenres.length ? (
              topGenres.map(([genre, count]) => (
                <span
                  key={genre}
                  className="pill text-[10px] uppercase tracking-[0.15em]"
                >
                  {genre} · {count}
                </span>
              ))
            ) : (
              <span className="text-[var(--text-muted)]">
                Ajoutez des categories pour voir cette statistique.
              </span>
            )}
          </div>
        </div>
      </div>
      <StatsExports
        libraryRows={(items ?? []).map((item) => ({
          title: toBook(item.books)?.title ?? "",
          authors: toBook(item.books)?.authors?.join(", ") ?? "",
          status: item.reading_status ?? "",
          rating: item.rating ?? "",
          started_at: item.reading_started_at ?? "",
          finished_at: item.reading_finished_at ?? "",
          pages_total: item.pages_total ?? "",
          pages_read: item.pages_read ?? "",
          added_at: item.added_at ?? "",
        }))}
        wishlistRows={(wishlistRows ?? []).map((row) => ({
          title: toBook(row.books)?.title ?? "",
          authors: toBook(row.books)?.authors?.join(", ") ?? "",
          added_at: row.added_at ?? "",
        }))}
      />
      <MonthlyGoalClient
        userId={user.id}
        year={currentYear}
        month={currentMonth}
        targetBooks={goal?.target_books ?? null}
        targetPages={goal?.target_pages ?? null}
        progressBooks={progressBooks}
        progressPages={progressPages}
      />
      <section className="space-y-3">
        <h2 className="section-title text-2xl font-semibold">
          Lectures par mois
        </h2>
        <div className="soft-card rounded-3xl p-6">
          {monthSeries.length ? (
            <svg
              viewBox={`0 0 ${Math.max(1, monthSeries.length) * 60} 160`}
              className="h-48 w-full"
              role="img"
              aria-label="Lectures par mois"
            >
              <rect width="100%" height="100%" fill="transparent" />
              {monthSeries.map((entry, index) => {
                const max = Math.max(...monthSeries.map((item) => item.count), 1);
                const height = Math.round((entry.count / max) * 100);
                const x = index * 60 + 10;
                const y = 120 - height;
                return (
                  <g key={entry.label}>
                    <rect
                      x={x}
                      y={y}
                      width={40}
                      height={height}
                      rx={8}
                      fill="var(--primary)"
                    />
                    <text
                      x={x + 20}
                      y={140}
                      textAnchor="middle"
                      fontSize="10"
                      fill="var(--text-muted)"
                    >
                      {entry.label.slice(5)}
                    </text>
                    <text
                      x={x + 20}
                      y={y - 6}
                      textAnchor="middle"
                      fontSize="10"
                      fill="var(--text-muted)"
                    >
                      {entry.count}
                    </text>
                  </g>
                );
              })}
            </svg>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              Ajoutez des dates de lecture pour generer ce graphique.
            </p>
          )}
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="section-title text-2xl font-semibold">
          Pages lues par mois
        </h2>
        <div className="soft-card rounded-3xl p-6">
          {pagesSeries.length ? (
            <svg
              viewBox={`0 0 ${Math.max(1, pagesSeries.length) * 60} 160`}
              className="h-48 w-full"
              role="img"
              aria-label="Pages lues par mois"
            >
              <rect width="100%" height="100%" fill="transparent" />
              {pagesSeries.map((entry, index) => {
                const max = Math.max(...pagesSeries.map((item) => item.pages), 1);
                const height = Math.round((entry.pages / max) * 100);
                const x = index * 60 + 10;
                const y = 120 - height;
                return (
                  <g key={entry.label}>
                    <rect
                      x={x}
                      y={y}
                      width={40}
                      height={height}
                      rx={8}
                      fill="var(--accent)"
                    />
                    <text
                      x={x + 20}
                      y={140}
                      textAnchor="middle"
                      fontSize="10"
                      fill="var(--text-muted)"
                    >
                      {entry.label.slice(5)}
                    </text>
                    <text
                      x={x + 20}
                      y={y - 6}
                      textAnchor="middle"
                      fontSize="10"
                      fill="var(--text-muted)"
                    >
                      {entry.pages}
                    </text>
                  </g>
                );
              })}
            </svg>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              Ajoutez des pages lues pour generer ce graphique.
            </p>
          )}
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="section-title text-2xl font-semibold">
          Historique de lecture
        </h2>
        <ReadingTimeline items={timelineItems} />
      </section>
    </div>
  );
}
