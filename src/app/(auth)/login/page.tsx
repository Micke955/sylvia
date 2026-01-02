"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError("Connexion impossible. Verifiez vos informations.");
      return;
    }

    router.push("/search");
    router.refresh();
  };

  return (
    <main className="page-transition mx-auto flex min-h-screen w-full max-w-5xl items-center px-6">
      <div className="glass w-full rounded-[2rem] p-8 md:p-12">
        <div className="grid gap-8 md:grid-cols-[1fr_1fr] md:items-center">
          <div className="space-y-4">
            <p className="pill w-fit">Bienvenue</p>
            <h1 className="section-title text-3xl font-semibold">
              Reprenez votre bibliotheque.
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              Connectez-vous pour acceder a vos lectures, wishlist et partage.
            </p>
          </div>
          <form
            className="space-y-4 text-[var(--text)]"
            onSubmit={handleSubmit}
          >
            <div>
              <label className="text-sm text-[var(--text-muted)]">Email</label>
              <input
                name="email"
                type="email"
                required
                className="input-field mt-2 text-[var(--text)] placeholder:text-[var(--text-muted)]"
              />
            </div>
            <div>
              <label className="text-sm text-[var(--text-muted)]">
                Mot de passe
              </label>
              <input
                name="password"
                type="password"
                required
                className="input-field mt-2 text-[var(--text)] placeholder:text-[var(--text-muted)]"
              />
            </div>
            {error ? (
              <p className="text-sm text-[var(--primary-strong)]">{error}</p>
            ) : null}
            <button type="submit" className="btn-primary w-full">
              {loading ? "Connexion..." : "Se connecter"}
            </button>
            <p className="text-sm text-[var(--text-muted)]">
              Pas encore de compte ?{" "}
              <Link
                href="/signup"
                className="text-[var(--accent-strong)] hover:text-[var(--text)]"
              >
                Inscription
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
