import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatUsername, synopsisText } from "@/lib/utils";

export default async function PublicReviewsPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const toBook = (
    books:
      | { title?: string; authors?: string[]; cover_url?: string | null; description?: string | null }
      | { title?: string; authors?: string[]; cover_url?: string | null; description?: string | null }[]
      | null,
  ) => (Array.isArray(books) ? books[0] : books);
  const supabase = await createClient();
  const resolvedParams = await params;
  const rawUsername = resolvedParams?.username ?? "";
  const normalizedUsername = rawUsername.trim().toLowerCase();

  if (!rawUsername) {
    notFound();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, is_public_library")
    .eq("username", normalizedUsername)
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  if (!profile.is_public_library) {
    return (
      <div className="soft-card rounded-3xl p-6 text-sm text-[var(--text-muted)]">
        Avis prives.
      </div>
    );
  }

  const { data: reviews } = await supabase
    .from("user_books")
    .select("book_id, rating, public_review, books(*)")
    .eq("user_id", profile.id)
    .eq("is_public_review", true)
    .order("added_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title text-3xl font-semibold">
          Avis publics de {formatUsername(profile.username) || "Lecteur"}
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Tous les avis rendus publics.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {(reviews ?? []).filter((item) => {
          const book = toBook(item.books);
          return Boolean(book?.cover_url && book?.description);
        }).length ? (
          (reviews ?? [])
            .filter((item) => {
              const book = toBook(item.books);
              return Boolean(book?.cover_url && book?.description);
            })
            .map((item) => {
              const book = toBook(item.books);
              return (
                <article key={item.book_id} className="soft-card rounded-3xl p-5">
                  <h2 className="section-title text-lg font-semibold">
                    {book?.title ?? "Titre"}
                  </h2>
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
                  {item.public_review ? (
                    <p className="mt-2 text-sm text-[var(--text)]">
                      “{item.public_review}”
                    </p>
                  ) : null}
                </article>
              );
            })
        ) : (
          <div className="soft-card rounded-3xl p-6 text-sm text-[var(--text-muted)]">
            Aucun avis public.
          </div>
        )}
      </div>
    </div>
  );
}
