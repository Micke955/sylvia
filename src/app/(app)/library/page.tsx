import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LibraryClient, { type LibraryItem } from "@/components/LibraryClient";

export const dynamic = "force-dynamic";

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

export default async function LibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="soft-card rounded-3xl p-8 text-center">
        <h1 className="section-title text-2xl font-semibold">Bibliotheque</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Connectez-vous pour acceder a votre bibliotheque.
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
      "book_id, reading_status, reading_started_at, reading_finished_at, pages_total, pages_read, is_public_review, public_review, personal_note, rating, added_at, books(*)",
    )
    .eq("user_id", user.id)
    .eq("in_library", true)
    .order("added_at", { ascending: false });

  const stats = computeStats((items ?? []) as unknown as LibraryItem[]);
  const timelineItems = (items ?? []) as unknown as LibraryItem[];
  const statusLabels: Record<string, string> = {
    to_read: "A lire",
    reading: "En cours",
    finished: "Lu",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title text-3xl font-semibold">Bibliotheque</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Suivez vos lectures et gardez des notes personnelles.
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
      </div>
      <LibraryClient items={(items ?? []) as LibraryItem[]} />
      <section className="space-y-3">
        <h2 className="section-title text-2xl font-semibold">Historique detaille</h2>
        <div className="soft-card overflow-hidden rounded-2xl">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-muted)] text-left text-xs uppercase text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-3">Livre</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Debut</th>
                <th className="px-4 py-3">Fin</th>
                <th className="px-4 py-3">Pages</th>
                <th className="px-4 py-3">Pages/jour</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {timelineItems.length ? (
                timelineItems.map((item) => {
                  const start = item.reading_started_at
                    ? new Date(item.reading_started_at)
                    : null;
                  const end = item.reading_finished_at
                    ? new Date(item.reading_finished_at)
                    : null;
                  const pages = item.pages_read ?? item.pages_total ?? null;
                  const days =
                    start && end
                      ? Math.max(
                          1,
                          Math.ceil((end.getTime() - start.getTime()) / 86400000),
                        )
                      : null;
                  const speed =
                    pages && days ? Math.round(pages / days) : null;

                  return (
                    <tr key={item.book_id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--text)]">
                          {item.books.title}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {item.books.authors.length
                            ? item.books.authors.join(", ")
                            : "Auteur inconnu"}
                        </p>
                      </td>
                      <td className="px-4 py-3 capitalize">
                        {statusLabels[item.reading_status ?? "to_read"]}
                      </td>
                      <td className="px-4 py-3">
                        {start ? start.toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {end ? end.toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td className="px-4 py-3">{pages ?? "—"}</td>
                      <td className="px-4 py-3">{speed ? `${speed}` : "—"}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-4 py-6 text-center text-[var(--text-muted)]" colSpan={6}>
                    Aucun historique a afficher.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
