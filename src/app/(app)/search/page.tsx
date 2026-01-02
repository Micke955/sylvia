import SearchPanel from "@/components/SearchPanel";
import OnboardingSteps from "@/components/OnboardingSteps";
import { createClient } from "@/lib/supabase/server";

export default async function SearchPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let showOnboarding = false;
  let username: string | null = null;
  if (user) {
    const { count } = await supabase
      .from("user_books")
      .select("book_id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .or("in_library.eq.true,in_wishlist.eq.true");
    showOnboarding = (count ?? 0) === 0;

    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    username = profile?.username ?? null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title text-3xl font-semibold">Recherche</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Explorez le catalogue Google Books et ajoutez vos favoris.
          </p>
        </div>
      </div>
      {showOnboarding ? <OnboardingSteps username={username} /> : null}
      <SearchPanel />
    </div>
  );
}
