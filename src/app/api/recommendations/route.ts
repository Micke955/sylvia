import { NextResponse } from "next/server";
import { normalizeBook, type GoogleBook } from "@/lib/books";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bookId = searchParams.get("bookId");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  let seedCategories: string[] = [];
  let seedTitle: string | null = null;
  if (bookId) {
    const { data } = await supabase
      .from("books")
      .select("id, title, categories")
      .eq("id", bookId)
      .maybeSingle();
    seedCategories = data?.categories ?? [];
    seedTitle = data?.title ?? null;
  }

  const { data: userBooks } = await supabase
    .from("user_books")
    .select(
      "book_id, rating, in_library, in_wishlist, books(id, title, categories, authors)",
    )
    .eq("user_id", user.id)
    .or("in_library.eq.true,in_wishlist.eq.true");

  const categoriesCount = new Map<string, number>();
  const titleScores = new Map<string, number>();
  const authorScores = new Map<string, number>();
  let libraryCount = 0;
  let wishlistCount = 0;

  (userBooks ?? []).forEach((row) => {
    if (row.in_library) libraryCount += 1;
    if (row.in_wishlist) wishlistCount += 1;
    const categories = row.books?.categories ?? [];
    categories.forEach((category) => {
      categoriesCount.set(category, (categoriesCount.get(category) ?? 0) + 1);
    });
    const title = row.books?.title;
    if (title) {
      const weight = typeof row.rating === "number" ? row.rating : 1;
      titleScores.set(title, (titleScores.get(title) ?? 0) + weight);
    }
    const authors = row.books?.authors ?? [];
    authors.forEach((author) => {
      if (!author) return;
      authorScores.set(author, (authorScores.get(author) ?? 0) + 1);
    });
  });

  seedCategories.forEach((category) => {
    categoriesCount.set(category, (categoriesCount.get(category) ?? 0) + 3);
  });

  if (seedTitle) {
    titleScores.set(seedTitle, (titleScores.get(seedTitle) ?? 0) + 3);
  }

  const topCategories = [...categoriesCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category]) => category);

  const topTitles = [...titleScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([title]) => title);

  const topAuthors = [...authorScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([author]) => author);

  let query = "";
  let basis: { type: "categories" | "titles" | "authors"; values: string[] } = {
    type: "categories",
    values: topCategories,
  };
  if (topCategories.length) {
    query = topCategories.map((category) => `subject:${category}`).join(" OR ");
  } else if (topAuthors.length) {
    query = topAuthors.map((author) => `inauthor:${author}`).join(" OR ");
    basis = { type: "authors", values: topAuthors };
  } else if (topTitles.length) {
    query = topTitles.map((title) => `intitle:${title}`).join(" OR ");
    basis = { type: "titles" as const, values: topTitles };
  } else {
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  const apiUrl = new URL("https://www.googleapis.com/books/v1/volumes");
  apiUrl.searchParams.set("q", query);
  apiUrl.searchParams.set("maxResults", "40");
  apiUrl.searchParams.set("langRestrict", "fr");

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (apiKey) apiUrl.searchParams.set("key", apiKey);

  const response = await fetch(apiUrl.toString(), { next: { revalidate: 120 } });
  if (!response.ok) {
    return NextResponse.json({ items: [] }, { status: 502 });
  }

  const payload = (await response.json()) as { items?: GoogleBook[] };
  const { data: owned } = await supabase
    .from("user_books")
    .select("book_id, books(isbn10, isbn13)")
    .eq("user_id", user.id)
    .or("in_library.eq.true,in_wishlist.eq.true");

  const ownedIds = new Set((owned ?? []).map((row) => row.book_id));
  const ownedIsbns = new Set(
    (owned ?? [])
      .flatMap((row) => [row.books?.isbn10, row.books?.isbn13])
      .filter((value): value is string => Boolean(value)),
  );
  let normalized = (payload.items ?? [])
    .filter((item) => item.volumeInfo?.language === "fr")
    .map(normalizeBook)
    .filter(
      (item) =>
        item.cover_url &&
        item.description &&
        !ownedIds.has(item.id) &&
        !(item.isbn10 && ownedIsbns.has(item.isbn10)) &&
        !(item.isbn13 && ownedIsbns.has(item.isbn13)),
    );

  if (!normalized.length && (topAuthors.length || topTitles.length)) {
    const fallbackQuery = topAuthors.length
      ? `inauthor:${topAuthors[0]}`
      : `intitle:${topTitles[0] ?? ""}`;
    const fallbackUrl = new URL("https://www.googleapis.com/books/v1/volumes");
    fallbackUrl.searchParams.set("q", fallbackQuery);
    fallbackUrl.searchParams.set("maxResults", "24");
    fallbackUrl.searchParams.set("langRestrict", "fr");
    if (apiKey) fallbackUrl.searchParams.set("key", apiKey);
    const fallbackResponse = await fetch(fallbackUrl.toString(), {
      next: { revalidate: 120 },
    });
    if (fallbackResponse.ok) {
      const fallbackPayload = (await fallbackResponse.json()) as {
        items?: GoogleBook[];
      };
      normalized = (fallbackPayload.items ?? [])
        .filter((item) => item.volumeInfo?.language === "fr")
        .map(normalizeBook)
        .filter(
          (item) =>
            item.cover_url &&
            item.description &&
            !ownedIds.has(item.id) &&
            !(item.isbn10 && ownedIsbns.has(item.isbn10)) &&
            !(item.isbn13 && ownedIsbns.has(item.isbn13)),
        );
    }
  }

  const reasons = {
    categories: new Set(topCategories.map((category) => category.toLowerCase())),
    authors: new Set(topAuthors.map((author) => author.toLowerCase())),
    titles: new Set(topTitles.map((title) => title.toLowerCase())),
  };

  const items = normalized.map((book) => {
    const bookCategories = (book.categories ?? []).map((category) =>
      category.toLowerCase(),
    );
    const bookAuthors = (book.authors ?? []).map((author) =>
      author.toLowerCase(),
    );
    const title = book.title.toLowerCase();

    const categoryHit = bookCategories.find((category) =>
      reasons.categories.has(category),
    );
    if (categoryHit) {
      return { ...book, reason: `Categorie proche: ${categoryHit}` };
    }

    const authorHit = bookAuthors.find((author) => reasons.authors.has(author));
    if (authorHit) {
      return { ...book, reason: `Auteur similaire: ${authorHit}` };
    }

    const titleHit = [...reasons.titles].find((word) =>
      title.includes(word),
    );
    if (titleHit) {
      return { ...book, reason: `Titre proche: ${titleHit}` };
    }

    return { ...book, reason: "Proche de vos lectures recentes" };
  });

  return NextResponse.json({
    items,
    basis,
    sources: { library: libraryCount, wishlist: wishlistCount },
  });
}
