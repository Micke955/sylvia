"use client";

import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";

type SynopsisModalProps = {
  open: boolean;
  title: string;
  description: string | null;
  onClose: () => void;
};

export default function SynopsisModal({
  open,
  title,
  description,
  onClose,
}: SynopsisModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const portalTarget = useMemo(
    () => (typeof document !== "undefined" ? document.body : null),
    [],
  );

  if (!open || !portalTarget) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/70 px-4 pt-6 sm:items-center sm:px-6 sm:pt-0">
      <div className="glass w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl p-6">
        <div className="flex items-start justify-between gap-4">
          <h3 className="section-title text-2xl font-semibold">{title}</h3>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Fermer
          </button>
        </div>
        <p className="mt-4 whitespace-pre-line text-sm text-[var(--text-muted)]">
          {description?.trim() || "Synopsis indisponible."}
        </p>
      </div>
    </div>,
    portalTarget,
  );
}
