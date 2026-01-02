import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import WishlistClient, { type WishlistItem } from "@/components/WishlistClient";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="soft-card rounded-3xl p-8 text-center">
        <h1 className="section-title text-2xl font-semibold">Wishlist</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Connectez-vous pour acceder a votre wishlist.
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
    .select("book_id, added_at, reading_status, books(*)")
    .eq("user_id", user.id)
    .eq("in_wishlist", true)
    .order("added_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title text-3xl font-semibold">Wishlist</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Gardez vos prochaines lectures a portee de main.
        </p>
      </div>
      <WishlistClient items={(items ?? []) as unknown as WishlistItem[]} />
    </div>
  );
}
