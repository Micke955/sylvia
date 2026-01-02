"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { normalizeAvatarUrl } from "@/lib/utils";

type ProfileSettingsProps = {
  userId: string;
  username: string | null;
  avatarUrl: string | null;
  isPublicLibrary: boolean;
  isPublicWishlist: boolean;
};

export default function ProfileSettings({
  userId,
  username,
  avatarUrl,
  isPublicLibrary,
  isPublicWishlist,
}: ProfileSettingsProps) {
  const maxAvatarMb = 5;
  const maxAvatarBytes = maxAvatarMb * 1024 * 1024;
  const [formState, setFormState] = useState({
    username: username ?? "",
    avatarUrl: normalizeAvatarUrl(avatarUrl) ?? "",
    isPublicLibrary,
    isPublicWishlist,
  });
  const [status, setStatus] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [cropStatus, setCropStatus] = useState<string | null>(null);
  const [imageRect, setImageRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [cropSelection, setCropSelection] = useState<{
    x: number;
    y: number;
    r: number;
  } | null>(null);
  const [dragState, setDragState] = useState<{
    mode: "move" | "resize";
    startX: number;
    startY: number;
    selection: { x: number; y: number; r: number };
  } | null>(null);

  const cropContainerRef = useRef<HTMLDivElement | null>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const extractAvatarPath = (url: string) => {
    const publicMarker = "/storage/v1/object/public/avatars/";
    const rawMarker = "/storage/v1/object/avatars/";
    const publicIndex = url.indexOf(publicMarker);
    if (publicIndex !== -1) {
      return url.slice(publicIndex + publicMarker.length);
    }
    const rawIndex = url.indexOf(rawMarker);
    if (rawIndex !== -1) {
      return url.slice(rawIndex + rawMarker.length);
    }
    return null;
  };

  const loadImageFromFile = (file: File) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Image error"));
      };
      img.src = objectUrl;
    });

  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

  const renderCroppedCircle = async (
    file: File,
    selection: { x: number; y: number; r: number },
    rect: { x: number; y: number; width: number; height: number },
    size = 512,
  ) => {
    const img = await loadImageFromFile(file);
    const scale = img.naturalWidth / rect.width;
    const sourceSize = selection.r * 2 * scale;
    const sx = (selection.x - selection.r - rect.x) * scale;
    const sy = (selection.y - selection.r - rect.y) * scale;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas error");
    }
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, sx, sy, sourceSize, sourceSize, 0, 0, size, size);
    ctx.restore();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((result) => resolve(result), "image/png"),
    );
    if (!blob) {
      throw new Error("Blob error");
    }
    return blob;
  };

  const shareLink = useMemo(() => {
    const normalized = formState.username.trim().toLowerCase();
    if (!normalized) return "";
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/u/${normalized}`;
  }, [formState.username]);

  const handleUpdate = async () => {
    const supabase = createClient();
    setStatus("Sauvegarde...");
    setCopyStatus(null);
    const trimmed = formState.username.trim();
    const normalized = trimmed.toLowerCase();

    if (!normalized) {
      setStatus("Pseudo requis.");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        username: normalized,
        avatar_url: normalizeAvatarUrl(formState.avatarUrl),
        is_public_library: formState.isPublicLibrary,
        is_public_wishlist: formState.isPublicWishlist,
      })
      .eq("id", userId);

    if (error) {
      setStatus("Erreur lors de la sauvegarde.");
      return;
    }

    setStatus("Profil mis a jour.");
  };

  const handleCopy = async () => {
    if (!shareLink) {
      setCopyStatus("Ajoutez un pseudo pour partager.");
      return;
    }

    try {
      await navigator.clipboard.writeText(shareLink);
      setCopyStatus("Lien copie.");
    } catch {
      setCopyStatus("Copie impossible.");
    }
  };

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > maxAvatarBytes) {
      setStatus(`Fichier trop volumineux (max ${maxAvatarMb} Mo).`);
      return;
    }

    const sourceUrl = URL.createObjectURL(file);
    setPendingFile(file);
    setCropSourceUrl(sourceUrl);
    setCropOpen(true);
    setStatus(null);
    setPreviewError(false);
  };

  const handleCropCancel = () => {
    if (cropSourceUrl) {
      URL.revokeObjectURL(cropSourceUrl);
    }
    setCropSourceUrl(null);
    setPendingFile(null);
    setCropSelection(null);
    setImageRect(null);
    setDragState(null);
    setCropStatus(null);
    setUploadPhase(null);
    setCropOpen(false);
  };

  const handleCropApply = async () => {
    if (!pendingFile || !cropSelection || !imageRect) {
      setStatus("Selection invalide.");
      return;
    }

    setUploading(true);
    setUploadPhase("Recadrage...");
    setStatus("Televersement...");
    setCropStatus(null);
    const supabase = createClient();
    const safeName = pendingFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${userId}/${Date.now()}-${safeName.replace(/\.[^.]+$/, "")}.png`;

    let uploadBlob: Blob;
    try {
      uploadBlob = await renderCroppedCircle(
        pendingFile,
        cropSelection,
        imageRect,
      );
    } catch {
      setStatus("Recadrage impossible.");
      setUploadPhase(null);
      setUploading(false);
      return;
    }

    setUploadPhase("Upload...");
    const { error } = await supabase.storage
      .from("avatars")
      .upload(filePath, uploadBlob, { upsert: true, contentType: "image/png" });

    if (error) {
      setStatus(`Upload echoue: ${error.message}`);
      setCropStatus(`Upload echoue: ${error.message}`);
      // eslint-disable-next-line no-console
      console.error("Avatar upload error", error);
      setUploadPhase(null);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const oldPath = extractAvatarPath(formState.avatarUrl);
    if (oldPath && oldPath !== filePath) {
      await supabase.storage.from("avatars").remove([oldPath]);
    }
    setFormState((prev) => ({ ...prev, avatarUrl: data.publicUrl }));
    setPreviewUrl(data.publicUrl);
    setPreviewError(false);
    setStatus("Avatar televerse.");
    setCropStatus("Avatar televerse.");
    setUploadPhase(null);
    setUploading(false);
    handleCropCancel();
  };

  const handleDeleteAvatar = async () => {
    const supabase = createClient();
    setStatus("Suppression...");
    const oldPath = extractAvatarPath(formState.avatarUrl);
    if (oldPath) {
      await supabase.storage.from("avatars").remove([oldPath]);
    }
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", userId);
    if (error) {
      setStatus("Suppression impossible.");
      return;
    }
    setFormState((prev) => ({ ...prev, avatarUrl: "" }));
    setPreviewUrl(null);
    setPreviewError(false);
    setStatus("Avatar supprime.");
  };

  const handleCropImageLoad = () => {
    const container = cropContainerRef.current;
    const image = cropImageRef.current;
    if (!container || !image) return;
    const containerRect = container.getBoundingClientRect();
    const imgRect = image.getBoundingClientRect();
    const relative = {
      x: imgRect.left - containerRect.left,
      y: imgRect.top - containerRect.top,
      width: imgRect.width,
      height: imgRect.height,
    };
    setImageRect(relative);
  };

  const getPointerPosition = (event: React.PointerEvent) => {
    const container = cropContainerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const startDrag = (
    mode: "move" | "resize",
    event: React.PointerEvent,
  ) => {
    if (!cropSelection) return;
    event.preventDefault();
    const pos = getPointerPosition(event);
    setDragState({
      mode,
      startX: pos.x,
      startY: pos.y,
      selection: cropSelection,
    });
  };

  const updateSelection = (event: React.PointerEvent) => {
    if (!dragState || !imageRect) return;
    const pos = getPointerPosition(event);
    const dx = pos.x - dragState.startX;
    const dy = pos.y - dragState.startY;
    const { selection } = dragState;

    if (dragState.mode === "move") {
      const nextX = clamp(
        selection.x + dx,
        imageRect.x + selection.r,
        imageRect.x + imageRect.width - selection.r,
      );
      const nextY = clamp(
        selection.y + dy,
        imageRect.y + selection.r,
        imageRect.y + imageRect.height - selection.r,
      );
      setCropSelection({ ...selection, x: nextX, y: nextY });
      return;
    }

    const radius = Math.hypot(pos.x - selection.x, pos.y - selection.y);
    const maxRadius = Math.min(
      selection.x - imageRect.x,
      selection.y - imageRect.y,
      imageRect.x + imageRect.width - selection.x,
      imageRect.y + imageRect.height - selection.y,
    );
    const nextRadius = clamp(radius, 40, maxRadius);
    setCropSelection({ ...selection, r: nextRadius });
  };

  const endDrag = () => {
    setDragState(null);
  };

  useEffect(() => {
    if (!cropOpen) {
      setCropSelection(null);
      setImageRect(null);
      setDragState(null);
    }
  }, [cropOpen]);

  useEffect(() => {
    if (imageRect && !cropSelection) {
      const radius = Math.min(imageRect.width, imageRect.height) * 0.35;
      setCropSelection({
        x: imageRect.x + imageRect.width / 2,
        y: imageRect.y + imageRect.height / 2,
        r: radius,
      });
    }
  }, [imageRect, cropSelection]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div>
          <label className="text-sm text-[var(--text-muted)]">Pseudo</label>
          <input
            className="input-field mt-2"
            value={formState.username}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, username: event.target.value }))
            }
          />
        </div>
      </div>
      <div className="soft-card rounded-2xl p-4">
        <p className="text-sm text-[var(--text-muted)]">Uploader un avatar</p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-muted)]">
            {previewUrl || formState.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl ?? formState.avatarUrl}
                alt="Apercu avatar"
                className={previewError ? "hidden" : "h-full w-full object-cover"}
                onError={() => setPreviewError(true)}
              />
            ) : null}
            {previewError ? (
              <div className="flex h-full w-full items-center justify-center text-[10px] text-[var(--text-muted)]">
                Image invalide
              </div>
            ) : null}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
            disabled={uploading}
          />
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {previewUrl || formState.avatarUrl ? "Modifier l'avatar" : "Ajouter un avatar"}
          </button>
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={handleDeleteAvatar}
            disabled={uploading || !formState.avatarUrl}
          >
            Supprimer l’avatar
          </button>
        </div>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          JPG/PNG, {maxAvatarMb} Mo max. Recadrage manuel circulaire.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={formState.isPublicLibrary}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                isPublicLibrary: event.target.checked,
              }))
            }
          />
          Bibliotheque publique
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={formState.isPublicWishlist}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                isPublicWishlist: event.target.checked,
              }))
            }
          />
          Wishlist publique
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button type="button" className="btn-primary" onClick={handleUpdate}>
          Enregistrer
        </button>
        {status ? <span className="text-sm text-[var(--text-muted)]">{status}</span> : null}
      </div>
      <div className="soft-card rounded-2xl p-4 text-sm text-[var(--text-muted)]">
        <p>Votre lien de partage :</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <p className="font-medium text-[var(--text)]">
            {shareLink || "Ajoutez un pseudo pour generer un lien."}
          </p>
          <button type="button" className="btn-secondary text-xs" onClick={handleCopy}>
            Copier le lien
          </button>
          {copyStatus ? <span>{copyStatus}</span> : null}
        </div>
      </div>
      {cropOpen && cropSourceUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
          <div className="glass w-full max-w-2xl rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <h3 className="section-title text-xl font-semibold">
                Recadrer votre avatar
              </h3>
              <button type="button" className="btn-ghost" onClick={handleCropCancel}>
                Fermer
              </button>
            </div>
            <div
              ref={cropContainerRef}
              className="relative mx-auto mt-6 aspect-square w-full max-w-[420px] overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)]"
              onPointerMove={updateSelection}
              onPointerUp={endDrag}
              onPointerLeave={endDrag}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={cropImageRef}
                src={cropSourceUrl}
                alt="Apercu recadrage"
                className="absolute inset-0 h-full w-full object-contain"
                onLoad={handleCropImageLoad}
              />
              {cropSelection && imageRect ? (
                <>
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `radial-gradient(circle at ${cropSelection.x}px ${cropSelection.y}px, rgba(0, 0, 0, 0) ${cropSelection.r}px, rgba(0, 0, 0, 0.55) ${
                        cropSelection.r + 1
                      }px)`,
                    }}
                  />
                  <div
                    className="absolute rounded-full border border-[var(--glass-highlight)]"
                    style={{
                      left: cropSelection.x - cropSelection.r,
                      top: cropSelection.y - cropSelection.r,
                      width: cropSelection.r * 2,
                      height: cropSelection.r * 2,
                    }}
                    onPointerDown={(event) => startDrag("move", event)}
                  />
                  {["top", "right", "bottom", "left"].map((handle) => {
                    const offset = cropSelection.r;
                    const handleSize = 12;
                    let left = cropSelection.x - handleSize / 2;
                    let top = cropSelection.y - handleSize / 2;
                    if (handle === "top") top = cropSelection.y - offset - handleSize / 2;
                    if (handle === "bottom")
                      top = cropSelection.y + offset - handleSize / 2;
                    if (handle === "left")
                      left = cropSelection.x - offset - handleSize / 2;
                    if (handle === "right")
                      left = cropSelection.x + offset - handleSize / 2;
                    return (
                      <div
                        key={handle}
                        className="absolute rounded-full border border-white/80 bg-white/80"
                        style={{
                          left,
                          top,
                          width: handleSize,
                          height: handleSize,
                          cursor: "nwse-resize",
                        }}
                        onPointerDown={(event) => startDrag("resize", event)}
                      />
                    );
                  })}
                </>
              ) : null}
            </div>
            <p className="mt-4 text-sm text-[var(--text-muted)]">
              Faites glisser le cercle pour positionner votre avatar. Utilisez les
              poignées pour ajuster la taille.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={handleCropCancel}>
                Annuler
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleCropApply}
                disabled={uploading}
              >
                {uploading ? "Envoi..." : "Utiliser cet avatar"}
              </button>
            </div>
            {uploading ? (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-[var(--text-muted)]">
                  {uploadPhase ?? "Televersement..."}
                </p>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-2/3 animate-pulse rounded-full bg-[var(--accent)]/70" />
                </div>
              </div>
            ) : null}
            {cropStatus ? (
              <p className="mt-3 text-sm text-[var(--text-muted)]">{cropStatus}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
