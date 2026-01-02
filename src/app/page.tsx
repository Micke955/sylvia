import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    <div className="app-shell">
      <main className="page-transition mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 pb-20 pt-14">
        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="flex flex-col gap-6">
            <p className="pill w-fit">Bibliotheque personnelle intelligente</p>
            <h1 className="section-title text-4xl font-semibold leading-tight md:text-5xl">
              Organisez vos lectures, partagez votre univers et trouvez votre
              prochaine page favorite.
            </h1>
            <p className="text-lg text-[var(--text-muted)]">
              SYLVIA combine recherche Google Books, wishlist et suivi de
              lecture pour vous offrir une experience fluide, mobile et sociale.
            </p>
            <div className="flex flex-wrap gap-3">
              {user ? (
                <>
                  <Link href="/search" className="btn-primary">
                    Acceder a l'app
                  </Link>
                  <Link href="/library" className="btn-secondary">
                    Ma bibliotheque
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/signup" className="btn-primary">
                    Commencer gratuitement
                  </Link>
                  <Link href="/search" className="btn-secondary">
                    Explorer le catalogue
                  </Link>
                </>
              )}
            </div>
            {user ? (
              <p className="text-sm text-[var(--text-muted)]">
                Vous etes deja connecte.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3 text-sm text-[var(--text-muted)]">
              <span>Recherche par titre, auteur ou ISBN</span>
              <span>•</span>
              <span>Wishlist partageable</span>
              <span>•</span>
              <span>Statuts de lecture</span>
            </div>
          </div>
          <div className="glass fade-in rounded-[2rem] p-6">
            <div className="grid gap-4">
              {[
                {
                  title: "La bibliotheque en mouvement",
                  detail: "Suivez vos lectures, notes et avis en un clin d'oeil.",
                },
                {
                  title: "Wishlist synchronisee",
                  detail: "Gardez vos envies de lecture a portee de main.",
                },
                {
                  title: "Partage public securise",
                  detail: "Decidez qui voit votre collection et pourquoi.",
                },
              ].map((item, index) => (
                <article
                  key={item.title}
                  className="soft-card rounded-2xl p-5"
                  style={{ ["--delay" as string]: index + 1 }}
                >
                  <h3 className="section-title text-lg font-semibold">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">
                    {item.detail}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {[
            {
              title: "Recherche rapide",
              detail:
                "Une barre de recherche intelligente et des resultats pagines avec couvertures.",
            },
            {
              title: "Bibliotheque vivante",
              detail:
                "Filtrez par statut, notez vos lectures et retrouvez chaque livre.",
            },
            {
              title: "Profil partageable",
              detail:
                "Creez une page publique et partagez votre wishlist en un lien.",
            },
          ].map((card, index) => (
            <div
              key={card.title}
              className="soft-card stagger rounded-3xl p-6"
              style={{ ["--delay" as string]: index + 1 }}
            >
              <h3 className="section-title text-xl font-semibold">
                {card.title}
              </h3>
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                {card.detail}
              </p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
