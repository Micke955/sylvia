import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CustomListsClient from "@/components/CustomListsClient";

export default async function ListsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="soft-card rounded-3xl p-8 text-center">
        <h1 className="section-title text-2xl font-semibold">Listes</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Connectez-vous pour creer vos listes.
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

  const { data: lists } = await supabase
    .from("user_lists")
    .select("id, name, description, is_public, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: listItems } = await supabase
    .from("user_list_books")
    .select("list_id, book_id, added_at, books(id, title, authors, cover_url)")
    .in("list_id", (lists ?? []).map((list) => list.id));

  const { data: libraryItems } = await supabase
    .from("user_books")
    .select("book_id, books(id, title, authors, cover_url)")
    .eq("user_id", user.id)
    .eq("in_library", true);

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title text-3xl font-semibold">Listes</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Creez vos listes personnalisees et ajoutez vos livres favoris.
        </p>
      </div>
      <CustomListsClient
        userId={user.id}
        username={profile?.username ?? null}
        lists={lists ?? []}
        listItems={listItems ?? []}
        libraryItems={libraryItems ?? []}
      />
    </div>
  );
}
