"use client";

import { useState } from "react";

export default function BackfillButton() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    setStatus("Mise a jour en cours...");
    try {
      const response = await fetch("/api/books/backfill", { method: "POST" });
      if (!response.ok) {
        setStatus("Mise a jour impossible.");
        return;
      }
      const data = (await response.json()) as {
        updated: number;
        skipped: number;
      };
      setStatus(
        `Mise a jour terminee: ${data.updated} livres enrichis, ${data.skipped} ignores.`,
      );
    } catch {
      setStatus("Mise a jour impossible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        className="btn-secondary text-xs"
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? "Mise a jour..." : "Rafraichir les nouveautes"}
      </button>
      {status ? <span className="text-xs text-[var(--text-muted)]">{status}</span> : null}
    </div>
  );
}
