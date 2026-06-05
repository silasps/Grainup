"use server";

import { revalidatePath } from "next/cache";

export async function revalidateBookPages() {
  revalidatePath("/editora/livros", "layout");
  revalidatePath("/editora/combos", "layout");
}
