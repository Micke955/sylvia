import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { BookRecord } from "@/lib/books";
import { isValidCoverUrl } from "@/lib/utils";
import ReadingRoulette from "@/components/ReadingRoulette";
import HomeBookCard from "@/components/HomeBookCard";

const filterVisible = (books: (BookRecord | null)[]) =>
  books.filter((book): book is BookRecord => {
    if (!book) return false;
    return Boolean(isValidCoverUrl(book.cover_url) && book.description);
  });

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="soft-card rounded-3xl p-8 text-center">
          <h1 className="section-title text-3xl font-semibold">Accueil</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Connectez-vous pour acceder a vos statistiques et a la roulette lecture.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link href="/login" className="btn-primary">
              Connexion
            </Link>
            <Link href="/signup" className="btn-secondary">
              Inscription
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { data: libraryItems } = await supabase
    .from("user_books")
    .select(
      "book_id, reading_status, reading_started_at, reading_finished_at, added_at, books(*)",
    )
    .eq("user_id", user.id)
    .eq("in_library", true)
    .order("added_at", { ascending: false });

  const { data: wishlistItems } = await supabase
    .from("user_books")
    .select("book_id, added_at, books(*)")
    .eq("user_id", user.id)
    .eq("in_wishlist", true)
    .order("added_at", { ascending: false });

  const wishlistBooks = filterVisible(
    (wishlistItems ?? []).map((item) => item.books as unknown as BookRecord | null),
  );

  const readingNow = filterVisible(
    (libraryItems ?? [])
      .filter((item) => item.reading_status === "reading")
      .map((item) => item.books as unknown as BookRecord | null),
  );
  const toRead = filterVisible(
    (libraryItems ?? [])
      .filter((item) => item.reading_status === "to_read")
      .map((item) => item.books as unknown as BookRecord | null),
  );
  const finished = filterVisible(
    (libraryItems ?? [])
      .filter((item) => item.reading_status === "finished")
      .map((item) => item.books as unknown as BookRecord | null),
  );


  const genreCount = (libraryItems ?? []).reduce<Record<string, number>>(
    (acc, item) => {
      const categories = (item.books as unknown as BookRecord | null)?.categories ?? [];
      categories.forEach((category) => {
        if (!category) return;
        acc[category] = (acc[category] ?? 0) + 1;
      });
      return acc;
    },
    {},
  );
  const topGenres = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="section-title text-3xl font-semibold">Accueil</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Vos prochains livres et statistiques en un coup d'oeil.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/search" className="btn-primary text-sm">
            Chercher un livre
          </Link>
          <Link href="/library" className="btn-secondary text-sm">
            Ma bibliotheque
          </Link>
        </div>
      </div>
      <div className="soft-card rounded-3xl p-5 text-sm text-[var(--text-muted)]">
        SYLVIA est une application de gestion de bibliotheque personnelle pour
        organiser vos lectures, suivre vos progres et partager vos coups de coeur.
      </div>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="soft-card rounded-3xl p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="section-title text-2xl font-semibold">Roulette lecture</h2>
              <p className="text-sm text-[var(--text-muted)]">
                Tentez une lecture surprise basee sur vos recommandations.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <ReadingRoulette />
          </div>
        </div>
        <div className="space-y-4">
          <div className="soft-card rounded-3xl p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
              En cours
            </p>
            {readingNow.length ? (
              <div className="mt-4 space-y-3">
                {readingNow.slice(0, 2).map((book) => (
                  <HomeBookCard key={book.id} book={book} />
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                Aucun livre en cours pour le moment.
              </p>
            )}
          </div>
          <div className="soft-card rounded-3xl p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
              A lire
            </p>
            {toRead.length ? (
              <div className="mt-4 space-y-3">
                {toRead.slice(0, 3).map((book) => (
                  <HomeBookCard key={book.id} book={book} />
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                Ajoutez des livres pour preparer vos prochaines lectures.
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <h2 className="section-title text-2xl font-semibold">Dernieres lectures</h2>
          {finished.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {finished.slice(0, 4).map((book) => (
                <HomeBookCard key={book.id} book={book} />
              ))}
            </div>
          ) : (
            <div className="soft-card rounded-3xl p-6 text-sm text-[var(--text-muted)]">
              Terminez un livre pour enrichir votre historique.
            </div>
          )}
        </section>
        <section className="space-y-4">
          <h2 className="section-title text-2xl font-semibold">Top genres</h2>
          <div className="soft-card rounded-3xl p-6">
            {topGenres.length ? (
              <div className="flex flex-wrap gap-2 text-xs">
                {topGenres.map(([genre, count]) => (
                  <span
                    key={genre}
                    className="pill text-[10px] uppercase tracking-[0.15em]"
                  >
                    {genre} · {count}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">
                Ajoutez des livres pour afficher vos genres preferes.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
