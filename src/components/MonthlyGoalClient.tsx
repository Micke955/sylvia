"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type MonthlyGoalClientProps = {
  userId: string;
  year: number;
  month: number;
  targetBooks: number | null;
  targetPages: number | null;
  progressBooks: number;
  progressPages: number;
};

export default function MonthlyGoalClient({
  userId,
  year,
  month,
  targetBooks,
  targetPages,
  progressBooks,
  progressPages,
}: MonthlyGoalClientProps) {
  const [books, setBooks] = useState(targetBooks ?? 0);
  const [pages, setPages] = useState(targetPages ?? 0);
  const [status, setStatus] = useState<string | null>(null);

  const handleSave = async () => {
    const supabase = createClient();
    setStatus("Sauvegarde...");
    const payload = {
      user_id: userId,
      year,
      month,
      target_books: books || null,
      target_pages: pages || null,
    };
    const { error } = await supabase
      .from("user_goals")
      .upsert(payload, { onConflict: "user_id,year,month" });
    if (error) {
      setStatus("Erreur de sauvegarde.");
      return;
    }
    setStatus("Objectif mis a jour.");
  };

  const handleReset = async () => {
    const supabase = createClient();
    setStatus("Reinitialisation...");
    const { error } = await supabase
      .from("user_goals")
      .delete()
      .eq("user_id", userId)
      .eq("year", year)
      .eq("month", month);
    if (error) {
      setStatus("Suppression impossible.");
      return;
    }
    setBooks(0);
    setPages(0);
    setStatus("Objectif supprime.");
  };

  const bookProgress =
    books > 0 ? Math.min(100, Math.round((progressBooks / books) * 100)) : 0;
  const pageProgress =
    pages > 0 ? Math.min(100, Math.round((progressPages / pages) * 100)) : 0;

  return (
    <div className="soft-card rounded-3xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Objectif mensuel
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            {month.toString().padStart(2, "0")}/{year}
          </p>
        </div>
        {status ? <span className="text-xs text-[var(--text-muted)]">{status}</span> : null}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs text-[var(--text-muted)]">Livres</label>
          <input
            type="number"
            min={0}
            className="input-field"
            value={books}
            onChange={(event) => setBooks(Number(event.target.value))}
          />
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[var(--accent)]"
              style={{ width: `${bookProgress}%` }}
            />
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            {progressBooks}/{books || 0} livres
          </p>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-[var(--text-muted)]">Pages</label>
          <input
            type="number"
            min={0}
            className="input-field"
            value={pages}
            onChange={(event) => setPages(Number(event.target.value))}
          />
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[var(--primary)]"
              style={{ width: `${pageProgress}%` }}
            />
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            {progressPages}/{pages || 0} pages
          </p>
        </div>
      </div>
      <button type="button" className="btn-primary mt-4 text-sm" onClick={handleSave}>
        Enregistrer l'objectif
      </button>
      <button type="button" className="btn-ghost mt-2 text-sm" onClick={handleReset}>
        Reinitialiser le mois
      </button>
    </div>
  );
}
