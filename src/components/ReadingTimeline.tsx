"use client";

import { useMemo, useState } from "react";

type TimelineItem = {
  book_id: string;
  title: string;
  authors: string;
  reading_status: string | null;
  reading_started_at: string | null;
  reading_finished_at: string | null;
  added_at: string;
};

type ReadingTimelineProps = {
  items: TimelineItem[];
};

const statusLabels: Record<string, string> = {
  to_read: "A lire",
  reading: "En cours",
  finished: "Lu",
};

export default function ReadingTimeline({ items }: ReadingTimelineProps) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [dateType, setDateType] = useState("finished");

  const years = useMemo(() => {
    const allYears = items
      .map((item) => {
        const date =
          dateType === "started"
            ? item.reading_started_at
            : dateType === "added"
              ? item.added_at
              : item.reading_finished_at;
        if (!date) return null;
        return new Date(date).getFullYear();
      })
      .filter((value): value is number => value !== null);
    return Array.from(new Set(allYears)).sort((a, b) => b - a);
  }, [items, dateType]);

  const filtered = useMemo(() => {
    return items
      .map((item) => {
        const date =
          dateType === "started"
            ? item.reading_started_at
            : dateType === "added"
              ? item.added_at
              : item.reading_finished_at;
        if (!date) return null;
        return { ...item, date };
      })
      .filter((item): item is TimelineItem & { date: string } => item !== null)
      .filter((item) =>
        statusFilter === "all" ? true : item.reading_status === statusFilter,
      )
      .filter((item) => {
        if (yearFilter === "all") return true;
        return new Date(item.date).getFullYear().toString() === yearFilter;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [items, statusFilter, yearFilter, dateType]);

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-sm text-[var(--text-muted)]">Date</label>
            <select
              className="input-field mt-2 w-full sm:w-52"
              value={dateType}
              onChange={(event) => setDateType(event.target.value)}
            >
              <option value="finished">Fin de lecture</option>
              <option value="started">Debut de lecture</option>
              <option value="added">Ajout</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-[var(--text-muted)]">Statut</label>
            <select
              className="input-field mt-2 w-full sm:w-52"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">Tous</option>
              <option value="to_read">A lire</option>
              <option value="reading">En cours</option>
              <option value="finished">Lu</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-[var(--text-muted)]">Annee</label>
            <select
              className="input-field mt-2 w-full sm:w-40"
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
            >
              <option value="all">Toutes</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filtered.length ? (
        <div className="space-y-4">
          {filtered.map((item) => (
            <div key={`${item.book_id}-${item.date}`} className="relative pl-6">
              <span className="absolute left-0 top-5 h-3 w-3 rounded-full bg-[var(--accent)]" />
              <div className="soft-card rounded-3xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
                  <span>
                    {new Date(item.date).toLocaleDateString("fr-FR")}
                  </span>
                  <span className="pill text-[10px]">
                    {statusLabels[item.reading_status ?? "to_read"] ?? "A lire"}
                  </span>
                </div>
                <h3 className="section-title mt-2 text-lg font-semibold">
                  {item.title}
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  {item.authors || "Auteur inconnu"}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="soft-card rounded-3xl p-6 text-sm text-[var(--text-muted)]">
          Aucun element pour ce filtre.
        </div>
      )}
    </div>
  );
}
