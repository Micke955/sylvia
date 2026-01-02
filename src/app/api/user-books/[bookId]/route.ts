import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const update: Record<string, unknown> = {};

  if ("in_library" in payload) update.in_library = payload.in_library;
  if ("in_wishlist" in payload) update.in_wishlist = payload.in_wishlist;
  if ("reading_status" in payload) update.reading_status = payload.reading_status;
  if ("reading_started_at" in payload)
    update.reading_started_at = payload.reading_started_at;
  if ("reading_finished_at" in payload)
    update.reading_finished_at = payload.reading_finished_at;
  if ("pages_total" in payload) update.pages_total = payload.pages_total;
  if ("pages_read" in payload) update.pages_read = payload.pages_read;
  if ("is_public_review" in payload)
    update.is_public_review = payload.is_public_review;
  if ("public_review" in payload) update.public_review = payload.public_review;
  if ("personal_note" in payload) update.personal_note = payload.personal_note;
  if ("rating" in payload) update.rating = payload.rating;

  const resolvedParams = await params;
  const { error } = await supabase
    .from("user_books")
    .update(update)
    .eq("user_id", user.id)
    .eq("book_id", resolvedParams.bookId);

  if (error) {
    return NextResponse.json({ message: "Update error" }, { status: 400 });
  }

  revalidatePath("/library");
  revalidatePath("/wishlist");
  revalidatePath("/profile");

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ bookId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  const { error } = await supabase
    .from("user_books")
    .delete()
    .eq("user_id", user.id)
    .eq("book_id", resolvedParams.bookId);

  if (error) {
    return NextResponse.json({ message: "Delete error" }, { status: 400 });
  }

  revalidatePath("/library");
  revalidatePath("/wishlist");
  revalidatePath("/profile");

  return NextResponse.json({ ok: true });
}
