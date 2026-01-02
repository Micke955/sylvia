import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import RecommendationsPanel from "@/components/RecommendationsPanel";

export default async function RecommendationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="soft-card rounded-3xl p-8 text-center">
        <h1 className="section-title text-2xl font-semibold">Recommandations</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Connectez-vous pour obtenir des suggestions personnalisees.
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title text-3xl font-semibold">
          Recommandations
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Des suggestions basees sur vos lectures preferees.
        </p>
      </div>
      <RecommendationsPanel />
    </div>
  );
}
