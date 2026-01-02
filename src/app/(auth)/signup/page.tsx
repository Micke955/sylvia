"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));
    const username = String(formData.get("username"));

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError("Inscription impossible. Verifiez vos informations.");
      return;
    }

    if (data.session) {
      router.push("/search");
      router.refresh();
      return;
    }

    setSuccess(
      "Compte cree. Confirmez votre email puis connectez-vous pour continuer.",
    );
  };

  return (
    <main className="page-transition mx-auto flex min-h-screen w-full max-w-5xl items-center px-6">
      <div className="glass w-full rounded-[2rem] p-8 md:p-12">
        <div className="grid gap-8 md:grid-cols-[1fr_1fr] md:items-center">
          <div className="space-y-4">
            <p className="pill w-fit">Nouvelle lecture</p>
            <h1 className="section-title text-3xl font-semibold">
              Creez votre espace SYLVIA
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              Votre profil et votre wishlist deviennent partageables en un clic.
            </p>
          </div>
          <form
            className="space-y-4 text-[var(--text)]"
            onSubmit={handleSubmit}
          >
            <div>
              <label className="text-sm text-[var(--text-muted)]">Pseudo</label>
              <input
                name="username"
                type="text"
                required
                className="input-field mt-2 text-[var(--text)] placeholder:text-[var(--text-muted)]"
              />
            </div>
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
            {success ? (
              <p className="text-sm text-[var(--accent-strong)]">{success}</p>
            ) : null}
            <button type="submit" className="btn-primary w-full">
              {loading ? "Creation..." : "Creer mon compte"}
            </button>
            <p className="text-sm text-[var(--text-muted)]">
              Deja inscrit ?{" "}
              <Link
                href="/login"
                className="text-[var(--accent-strong)] hover:text-[var(--text)]"
              >
                Connexion
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
