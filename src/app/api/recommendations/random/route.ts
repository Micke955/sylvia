import { NextResponse } from "next/server";
import { normalizeBook, type GoogleBook } from "@/lib/books";
import { createClient } from "@/lib/supabase/server";

const subjects = [
  "fiction",
  "thriller",
  "romance",
  "fantasy",
  "science fiction",
  "mystery",
  "history",
  "biography",
  "self-help",
  "business",
  "psychology",
  "travel",
  "cooking",
  "poetry",
  "young adult",
];

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  const { data: userBooks } = await supabase
    .from("user_books")
    .select("books(categories)")
    .eq("user_id", user.id)
    .or("in_library.eq.true,in_wishlist.eq.true");

  const userSubjects = (userBooks ?? [])
    .flatMap((row) => row.books?.categories ?? [])
    .map((value) => value.trim())
    .filter((value) => value.length >= 3);

  const subjectPool = userSubjects.length ? userSubjects : subjects;

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  const attempts = 3;
  let items: Array<ReturnType<typeof normalizeBook> & { reason?: string }> = [];

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const subject = subjectPool[Math.floor(Math.random() * subjectPool.length)];
    const startIndex = Math.floor(Math.random() * 8) * 10;

    const apiUrl = new URL("https://www.googleapis.com/books/v1/volumes");
    apiUrl.searchParams.set("q", `subject:${subject}`);
    apiUrl.searchParams.set("startIndex", String(startIndex));
    apiUrl.searchParams.set("maxResults", "40");
    apiUrl.searchParams.set("langRestrict", "fr");
    apiUrl.searchParams.set("orderBy", "relevance");
    if (apiKey) apiUrl.searchParams.set("key", apiKey);

    const response = await fetch(apiUrl.toString(), { next: { revalidate: 300 } });
    if (!response.ok) {
      continue;
    }

    const payload = (await response.json()) as { items?: GoogleBook[] };
    items = (payload.items ?? [])
      .filter((item) => item.volumeInfo?.language === "fr")
      .map(normalizeBook)
      .filter((item) => item.cover_url && item.description)
      .slice(0, 12)
      .map((item) => ({ ...item, reason: "Decouverte aleatoire" }));

    if (items.length) break;
  }

  return NextResponse.json({ items });
}
