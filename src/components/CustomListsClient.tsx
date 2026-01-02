"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type ListRecord = {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean | null;
  created_at: string;
};

export type ListItem = {
  list_id: string;
  book_id: string;
  added_at: string;
  books: {
    id: string;
    title: string;
    authors: string[];
    cover_url: string | null;
  } | null;
};

export type LibraryItem = {
  book_id: string;
  books: {
    id: string;
    title: string;
    authors: string[];
    cover_url: string | null;
  } | null;
};

type CustomListsClientProps = {
  userId: string;
  username: string | null;
  lists: ListRecord[];
  listItems: ListItem[];
  libraryItems: LibraryItem[];
};

export default function CustomListsClient({
  userId,
  username,
  lists,
  listItems,
  libraryItems,
}: CustomListsClientProps) {
  const [localLists, setLocalLists] = useState(lists);
  const [localItems, setLocalItems] = useState(listItems);
  const [selectedListId, setSelectedListId] = useState<string | null>(
    lists[0]?.id ?? null,
  );
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const listMap = useMemo(() => {
    const map = new Map<string, ListItem[]>();
    localItems.forEach((item) => {
      const entry = map.get(item.list_id) ?? [];
      entry.push(item);
      map.set(item.list_id, entry);
    });
    return map;
  }, [localItems]);

  const selectedItems = selectedListId
    ? listMap.get(selectedListId) ?? []
    : [];

  const handleCreateList = async () => {
    const name = newListName.trim();
    if (!name) {
      setStatus("Nom requis.");
      return;
    }
    setStatus("Creation...");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("user_lists")
      .insert({ user_id: userId, name, description: newListDescription || null })
      .select("id, name, description, is_public, created_at")
      .single();
    if (error) {
      setStatus("Creation impossible.");
      return;
    }
    setLocalLists((prev) => [data, ...prev]);
    setSelectedListId(data.id);
    setNewListName("");
    setNewListDescription("");
    setStatus("Liste creee.");
  };

  const selectedList = localLists.find((list) => list.id === selectedListId) ?? null;

  const handleTogglePublic = async () => {
    if (!selectedList) return;
    const supabase = createClient();
    const nextPublic = !selectedList.is_public;
    const { error } = await supabase
      .from("user_lists")
      .update({ is_public: nextPublic })
      .eq("id", selectedList.id);
    if (error) return;
    setLocalLists((prev) =>
      prev.map((list) =>
        list.id === selectedList.id ? { ...list, is_public: nextPublic } : list,
      ),
    );
  };

  const handleUpdateDescription = async (value: string) => {
    if (!selectedList) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("user_lists")
      .update({ description: value || null })
      .eq("id", selectedList.id);
    if (error) return;
    setLocalLists((prev) =>
      prev.map((list) =>
        list.id === selectedList.id ? { ...list, description: value } : list,
      ),
    );
  };

  const handleCopyLink = async () => {
    if (!selectedList || !selectedList.is_public || !username) {
      setCopyStatus("Activez le partage et renseignez un pseudo.");
      return;
    }
    const link = `${window.location.origin}/u/${username}/lists/${selectedList.id}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopyStatus("Lien copie.");
    } catch {
      setCopyStatus("Copie impossible.");
    }
  };

  const addToList = async (listId: string, bookId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("user_list_books")
      .insert({ list_id: listId, book_id: bookId })
      .select("list_id, book_id, added_at, books(id, title, authors, cover_url)")
      .single();
    if (error) return;
    setLocalItems((prev) => [...prev, data as unknown as ListItem]);
  };

  const removeFromList = async (listId: string, bookId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("user_list_books")
      .delete()
      .eq("list_id", listId)
      .eq("book_id", bookId);
    if (error) return;
    setLocalItems((prev) =>
      prev.filter(
        (item) => !(item.list_id === listId && item.book_id === bookId),
      ),
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[0.45fr_0.55fr]">
      <div className="space-y-4">
        <div className="glass rounded-2xl p-4">
          <label className="text-sm text-[var(--text-muted)]">
            Nouvelle liste
          </label>
          <input
            className="input-field mt-2"
            value={newListName}
            onChange={(event) => setNewListName(event.target.value)}
            placeholder="Ex: A acheter"
          />
          <input
            className="input-field mt-2"
            value={newListDescription}
            onChange={(event) => setNewListDescription(event.target.value)}
            placeholder="Description (optionnel)"
          />
          <button type="button" className="btn-primary mt-3" onClick={handleCreateList}>
            Creer
          </button>
          {status ? <p className="mt-2 text-xs text-[var(--text-muted)]">{status}</p> : null}
        </div>
        <div className="soft-card rounded-3xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Mes listes
          </p>
          <div className="mt-3 space-y-2">
            {localLists.length ? (
              localLists.map((list) => (
                <button
                  key={list.id}
                  type="button"
                  className={`w-full rounded-2xl border px-4 py-3 text-left text-sm ${
                    selectedListId === list.id
                      ? "border-[var(--accent)] bg-white/10"
                      : "border-[var(--border)] bg-[var(--surface-muted)]"
                  }`}
                  onClick={() => setSelectedListId(list.id)}
                >
                  <p className="font-semibold">{list.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {(listMap.get(list.id) ?? []).length} livre(s)
                  </p>
                </button>
              ))
            ) : (
              <p className="text-sm text-[var(--text-muted)]">
                Aucune liste pour le moment.
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="soft-card rounded-3xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Liste selectionnee
          </p>
          {selectedListId ? (
            <div className="mt-3 space-y-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm">
                <p className="font-semibold">{selectedList?.name ?? "Liste"}</p>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Description
                </p>
                <textarea
                  className="input-field mt-2"
                  value={selectedList?.description ?? ""}
                  onChange={(event) => handleUpdateDescription(event.target.value)}
                />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    onClick={handleTogglePublic}
                  >
                    {selectedList?.is_public ? "Rendre prive" : "Partager la liste"}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    onClick={handleCopyLink}
                  >
                    Copier le lien
                  </button>
                  {copyStatus ? (
                    <span className="text-xs text-[var(--text-muted)]">
                      {copyStatus}
                    </span>
                  ) : null}
                </div>
              </div>
              {selectedItems.length ? (
                selectedItems.map((item) => (
                  <div
                    key={`${item.list_id}-${item.book_id}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm"
                  >
                    <div>
                      <p className="font-semibold">
                        {item.books?.title ?? "Titre"}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {item.books?.authors?.length
                          ? item.books.authors.join(", ")
                          : "Auteur inconnu"}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-ghost text-xs"
                      onClick={() => removeFromList(item.list_id, item.book_id)}
                    >
                      Retirer
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--text-muted)]">
                  Aucun livre dans cette liste.
                </p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              Selectionnez une liste.
            </p>
          )}
        </div>
        <div className="soft-card rounded-3xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Ajouter depuis la bibliotheque
          </p>
          {libraryItems.length ? (
            <div className="mt-3 space-y-2">
              {libraryItems.map((item) => (
                <div
                  key={item.book_id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm"
                >
                  <div>
                    <p className="font-semibold">
                      {item.books?.title ?? "Titre"}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {item.books?.authors?.length
                        ? item.books.authors.join(", ")
                        : "Auteur inconnu"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-primary text-xs"
                    disabled={!selectedListId}
                    onClick={() =>
                      selectedListId
                        ? addToList(selectedListId, item.book_id)
                        : null
                    }
                  >
                    Ajouter
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              Aucun livre en bibliotheque.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
