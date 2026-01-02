import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  const { data, error } = await supabase
    .from("user_books")
    .select(
      "book_id, reading_status, reading_started_at, reading_finished_at, pages_total, pages_read, is_public_review, public_review, personal_note, rating, added_at, books(*)",
    )
    .eq("user_id", user.id)
    .eq("in_library", true)
    .order("added_at", { ascending: false });

  if (error) {
    return NextResponse.json({ items: [] }, { status: 400 });
  }

  return NextResponse.json({ items: data ?? [] });
}
