import { NextResponse } from "next/server";
import { normalizeBook, type GoogleBook } from "@/lib/books";

const cache = new Map<string, { timestamp: number; data: unknown }>();
const CACHE_TTL = 1000 * 60 * 5;

function buildQuery(query: string, filter: string) {
  if (filter === "author") return `inauthor:${query}`;
  if (filter === "isbn") return `isbn:${query}`;
  if (filter === "series") return `intitle:${query}+series`;
  return `intitle:${query}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() ?? "";
  const filter = searchParams.get("filter") ?? "title";
  const language = searchParams.get("lang") ?? "fr";
  const includeOther = searchParams.get("includeOther") === "1";
  const orderBy = searchParams.get("orderBy") ?? "relevance";
  const page = Number(searchParams.get("page") ?? "1");

  if (!query) {
    return NextResponse.json({ items: [], totalItems: 0 });
  }

  const startIndex = Math.max(0, (page - 1) * 10);
  const cacheKey = `${filter}:${query}:${language}:${orderBy}:${startIndex}`;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  const apiUrl = new URL("https://www.googleapis.com/books/v1/volumes");
  const baseQuery = buildQuery(query, filter);
  apiUrl.searchParams.set("q", baseQuery);
  apiUrl.searchParams.set("startIndex", String(startIndex));
  apiUrl.searchParams.set("maxResults", "10");
  apiUrl.searchParams.set("orderBy", orderBy);
  if (language && !includeOther) {
    apiUrl.searchParams.set("langRestrict", language);
  }
  if (apiKey) {
    apiUrl.searchParams.set("key", apiKey);
  }

  const response = await fetch(apiUrl.toString(), { next: { revalidate: 60 } });

  if (!response.ok) {
    return NextResponse.json({ items: [], totalItems: 0 }, { status: 502 });
  }

  const data = (await response.json()) as {
    totalItems?: number;
    items?: GoogleBook[];
  };

  const normalized = (data.items ?? [])
    .map(normalizeBook)
    .filter((item) => Boolean(item.cover_url && item.description));
  const payload = { items: normalized, totalItems: normalized.length };

  cache.set(cacheKey, { timestamp: Date.now(), data: payload });

  return NextResponse.json(payload);
}
