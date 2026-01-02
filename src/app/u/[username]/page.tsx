import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatUsername, isValidCoverUrl, normalizeAvatarUrl, synopsisText } from "@/lib/utils";
import AvatarImage from "@/components/AvatarImage";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const toBook = (
    books:
      | { title?: string; authors?: string[]; cover_url?: string | null; description?: string | null; categories?: string[] | null }
      | { title?: string; authors?: string[]; cover_url?: string | null; description?: string | null; categories?: string[] | null }[]
      | null,
  ) => (Array.isArray(books) ? books[0] : books);
  const supabase = await createClient();
  const resolvedParams = await params;
  const rawUsername = resolvedParams?.username ?? "";
  const normalizedUsername = rawUsername.trim().toLowerCase();

  if (!rawUsername) {
    notFound();
  }

  let { data: profile } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, is_public_library, is_public_wishlist")
    .eq("username", normalizedUsername)
    .maybeSingle();

  if (!profile && rawUsername !== normalizedUsername) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, is_public_library, is_public_wishlist")
      .eq("username", rawUsername)
      .maybeSingle();
    profile = data ?? null;
  }

  if (!profile) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, is_public_library, is_public_wishlist")
      .ilike("username", normalizedUsername)
      .maybeSingle();
    profile = data ?? null;
  }

  if (!profile) {
    notFound();
  }

  const library =
    profile.is_public_library
      ? await supabase
          .from("user_books")
          .select("book_id, reading_status, rating, public_review, is_public_review, books(*)")
          .eq("user_id", profile.id)
          .eq("in_library", true)
      : { data: [] };

  const { count: reviewCount } = await supabase
    .from("user_books")
    .select("book_id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .eq("is_public_review", true);

  const { data: publicLists } = await supabase
    .from("user_lists")
    .select("id, name, description")
    .eq("user_id", profile.id)
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  const wishlist =
    profile.is_public_wishlist
      ? await supabase
          .from("user_books")
          .select("book_id, reading_status, books(*)")
          .eq("user_id", profile.id)
          .eq("in_wishlist", true)
      : { data: [] };

  const libraryItems = (library.data ?? []) as Array<{
    rating: number | null;
    books:
      | { categories?: string[] | null }
      | { categories?: string[] | null }[]
      | null;
  }>;
  const wishlistItems = wishlist.data ?? [];
  const totalLibrary = libraryItems.length;
  const totalWishlist = wishlistItems.length;
  const ratingValues = libraryItems
    .map((item) => item.rating)
    .filter((value): value is number => value !== null);
  const avgRating =
    ratingValues.length > 0
      ? (ratingValues.reduce((acc, value) => acc + value, 0) / ratingValues.length).toFixed(1)
      : "0";
  const genreCount = libraryItems.reduce<Record<string, number>>((acc, item) => {
    const categories = toBook(item.books)?.categories ?? [];
    categories.forEach((category) => {
      if (!category) return;
      acc[category] = (acc[category] ?? 0) + 1;
    });
    return acc;
  }, {});
  const topGenres = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="soft-card rounded-3xl p-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-muted)]">
            {normalizeAvatarUrl(profile.avatar_url) ? (
              <AvatarImage
                src={normalizeAvatarUrl(profile.avatar_url) ?? ""}
                alt={profile.username ?? "Avatar"}
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          <div>
            <h1 className="section-title text-2xl font-semibold">
              {formatUsername(profile.username) || "Lecteur"}
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              Collection partagee
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="pill text-[10px] uppercase tracking-[0.15em]">
                Profil public
              </span>
              {profile.is_public_library ? (
                <span className="pill text-[10px] uppercase tracking-[0.15em]">
                  Bibliotheque publique
                </span>
              ) : null}
              {profile.is_public_wishlist ? (
                <span className="pill text-[10px] uppercase tracking-[0.15em]">
                  Wishlist publique
                </span>
              ) : null}
              {reviewCount ? (
                <span className="pill text-[10px] uppercase tracking-[0.15em]">
                  Avis publics
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="soft-card rounded-2xl p-4">
          <p className="text-xs text-[var(--text-muted)]">Livres partages</p>
          <p className="section-title text-2xl font-semibold">{totalLibrary}</p>
        </div>
        <div className="soft-card rounded-2xl p-4">
          <p className="text-xs text-[var(--text-muted)]">Wishlist</p>
          <p className="section-title text-2xl font-semibold">{totalWishlist}</p>
        </div>
        <div className="soft-card rounded-2xl p-4">
          <p className="text-xs text-[var(--text-muted)]">Note moyenne</p>
          <p className="section-title text-2xl font-semibold">{avgRating}/5</p>
        </div>
      </div>
      <div className="soft-card rounded-3xl p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Genres preferes
        </p>
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
              Aucun genre visible.
            </span>
          )}
        </div>
      </div>

      {publicLists?.length ? (
        <section className="space-y-3">
          <h2 className="section-title text-xl font-semibold">
            Listes publiques
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {publicLists.map((list) => (
              <a
                key={list.id}
                className="soft-card rounded-3xl p-5"
                href={`/u/${profile.username ?? "profil"}/lists/${list.id}`}
              >
                <h3 className="section-title text-lg font-semibold">
                  {list.name}
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  {list.description ?? "Liste publique partagee"}
                </p>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {profile.is_public_library ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="section-title text-xl font-semibold">Bibliotheque</h2>
            {reviewCount ? (
              <a
                className="btn-secondary text-xs"
                href={`/u/${profile.username ?? "profil"}/reviews`}
              >
                Voir tous les avis
              </a>
            ) : null}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {(library.data ?? [])
              .filter((item) => {
                const book = toBook(item.books);
                if (!isValidCoverUrl(book?.cover_url ?? null)) return false;
                return Boolean(book?.description);
              })
              .map((item) => {
                const book = toBook(item.books);
                return (
                  <article key={item.book_id} className="soft-card rounded-3xl p-5">
                    <h3 className="section-title text-lg font-semibold">
                      {book?.title ?? "Titre"}
                    </h3>
                    <span className="pill text-[10px] uppercase tracking-[0.15em]">
                      {item.reading_status === "finished"
                        ? "Lu"
                        : item.reading_status === "reading"
                          ? "En cours"
                          : "A lire"}
                    </span>
                    <p className="text-xs text-[var(--text-muted)]">
                      {book?.authors?.length
                        ? book.authors.join(", ")
                        : "Auteur inconnu"}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {synopsisText(book?.description ?? null)}
                    </p>
                    {item.rating ? (
                      <p className="mt-2 text-xs text-[var(--text-muted)]">
                        Note : {item.rating}/5
                      </p>
                    ) : null}
                    {item.is_public_review && item.public_review ? (
                      <p className="mt-2 text-sm text-[var(--text)]">
                        “{item.public_review}”
                      </p>
                    ) : null}
                  </article>
                );
              })}
          </div>
        </section>
      ) : (
        <div className="soft-card rounded-3xl p-5 text-sm text-[var(--text-muted)]">
          Bibliotheque privee.
        </div>
      )}

      {profile.is_public_wishlist ? (
        <section className="space-y-3">
          <h2 className="section-title text-xl font-semibold">Wishlist</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {(wishlist.data ?? [])
              .filter((item) => {
                const book = toBook(item.books);
                if (!isValidCoverUrl(book?.cover_url ?? null)) return false;
                return Boolean(book?.description);
              })
              .map((item) => {
                const book = toBook(item.books);
                return (
                  <article key={item.book_id} className="soft-card rounded-3xl p-5">
                    <h3 className="section-title text-lg font-semibold">
                      {book?.title ?? "Titre"}
                    </h3>
                    <span className="pill text-[10px] uppercase tracking-[0.15em]">
                      {item.reading_status === "finished"
                        ? "Lu"
                        : item.reading_status === "reading"
                          ? "En cours"
                          : "A lire"}
                    </span>
                    <p className="text-xs text-[var(--text-muted)]">
                      {book?.authors?.length
                        ? book.authors.join(", ")
                        : "Auteur inconnu"}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {synopsisText(book?.description ?? null)}
                    </p>
                  </article>
                );
              })}
          </div>
        </section>
      ) : (
        <div className="soft-card rounded-3xl p-5 text-sm text-[var(--text-muted)]">
          Wishlist privee.
        </div>
      )}
    </div>
  );
}
