import { createClient } from "@/lib/supabase/server";
import SiteNav from "@/components/SiteNav";
import MobileNav from "@/components/MobileNav";
import NotificationBanner from "@/components/NotificationBanner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    profile = data ?? null;
  }

  let wishlistCount = 0;
  let readingItems: { book_id: string; reading_started_at: string | null; title: string }[] = [];

  if (user) {
    const { count } = await supabase
      .from("user_books")
      .select("book_id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("in_wishlist", true);
    wishlistCount = count ?? 0;

    const { data } = await supabase
      .from("user_books")
      .select("book_id, reading_started_at, books(title)")
      .eq("user_id", user.id)
      .eq("reading_status", "reading")
      .limit(3);
    readingItems = (data ?? []).map((item) => ({
      book_id: item.book_id,
      reading_started_at: item.reading_started_at ?? null,
      title: item.books?.title ?? "Lecture en cours",
    }));
  }

  return (
    <div className="app-shell">
      <SiteNav user={user} profile={profile} />
      <main className="page-transition mx-auto w-full max-w-6xl px-6 pb-24 pt-24 lg:pb-10 lg:pt-28">
        {user ? (
          <div className="mb-6">
            <NotificationBanner
              wishlistCount={wishlistCount}
              readingItems={readingItems}
            />
          </div>
        ) : null}
        {children}
      </main>
      <MobileNav user={user} />
    </div>
  );
}
