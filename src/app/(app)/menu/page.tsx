import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function MenuPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const items = [
    { href: "/stats", label: "Statistiques" },
    { href: "/feed", label: "Feed" },
    { href: "/recommendations", label: "Recommandations" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title text-3xl font-semibold">Plus</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Accedez rapidement aux autres sections.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="soft-card rounded-3xl p-4 text-sm"
          >
            <p className="font-semibold">{item.label}</p>
            <p className="text-xs text-[var(--text-muted)]">
              Ouvrir {item.label.toLowerCase()}.
            </p>
          </Link>
        ))}
      </div>
      {!user ? (
        <div className="soft-card rounded-3xl p-6 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            Connectez-vous pour acceder a toutes les fonctionnalites.
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
      ) : null}
    </div>
  );
}
