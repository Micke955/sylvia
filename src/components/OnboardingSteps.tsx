import Link from "next/link";
import { formatUsername } from "@/lib/utils";

type OnboardingStepsProps = {
  username?: string | null;
};

export default function OnboardingSteps({ username }: OnboardingStepsProps) {
  return (
    <div className="soft-card rounded-3xl p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
        Demarrage rapide
      </p>
      <h2 className="section-title mt-2 text-2xl font-semibold">
        Bienvenue {formatUsername(username) || "sur SYLVIA"}
      </h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="glass rounded-2xl p-4 text-sm">
          <p className="font-semibold">1. Rechercher</p>
          <p className="mt-2 text-[var(--text-muted)]">
            Trouvez un livre avec le moteur Google Books.
          </p>
        </div>
        <div className="glass rounded-2xl p-4 text-sm">
          <p className="font-semibold">2. Ajouter</p>
          <p className="mt-2 text-[var(--text-muted)]">
            Ajoutez-le a votre wishlist ou bibliotheque.
          </p>
        </div>
        <div className="glass rounded-2xl p-4 text-sm">
          <p className="font-semibold">3. Organiser</p>
          <p className="mt-2 text-[var(--text-muted)]">
            Classez vos lectures et partagez votre profil.
          </p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link href="/search" className="btn-primary text-sm">
          Lancer une recherche
        </Link>
        <Link href="/profile" className="btn-secondary text-sm">
          Completer mon profil
        </Link>
      </div>
    </div>
  );
}
