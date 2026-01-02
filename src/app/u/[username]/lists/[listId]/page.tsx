import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatUsername } from "@/lib/utils";

export default async function PublicListPage({
  params,
}: {
  params: Promise<{ username: string; listId: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await params;
  const rawUsername = resolvedParams?.username ?? "";
  const listId = resolvedParams?.listId ?? "";
  const normalizedUsername = rawUsername.trim().toLowerCase();

  if (!rawUsername || !listId) {
    notFound();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("username", normalizedUsername)
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  const { data: list } = await supabase
    .from("user_lists")
    .select("id, name, description, is_public, user_id")
    .eq("id", listId)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (!list || !list.is_public) {
    notFound();
  }

  const { data: items } = await supabase
    .from("user_list_books")
    .select("book_id, books(id, title, authors, cover_url, description)")
    .eq("list_id", list.id);

  const visibleItems = (items ?? []).filter(
    (item) => item.books?.cover_url && item.books?.description,
  );

  return (
    <div className="space-y-6">
      <div className="soft-card rounded-3xl p-6">
        <h1 className="section-title text-3xl font-semibold">{list.name}</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Liste publique de {formatUsername(profile.username) || "Lecteur"}
        </p>
        {list.description ? (
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            {list.description}
          </p>
        ) : null}
      </div>
      {visibleItems.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {visibleItems.map((item) => (
            <article key={item.book_id} className="soft-card rounded-3xl p-5">
              <h3 className="section-title text-lg font-semibold">
                {item.books?.title ?? "Titre"}
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                {item.books?.authors?.length
                  ? item.books.authors.join(", ")
                  : "Auteur inconnu"}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {item.books?.description ?? "Synopsis indisponible."}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <div className="soft-card rounded-3xl p-6 text-sm text-[var(--text-muted)]">
          Aucun livre avec couverture et synopsis.
        </div>
      )}
    </div>
  );
}
