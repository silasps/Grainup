import { NextResponse } from "next/server";
import { restoreBlingProductFisicosAction } from "@/app/(admin)/admin/editora/livros/actions";

async function handle() {
  const result = await restoreBlingProductFisicosAction();
  return NextResponse.json(result);
}

export { handle as GET, handle as POST };

