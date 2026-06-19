import { NextResponse } from "next/server";
import { pullBlingDimensionsToDbAction } from "@/app/(admin)/admin/editora/livros/actions";

async function handle() {
  const result = await pullBlingDimensionsToDbAction();
  return NextResponse.json(result);
}

export { handle as GET, handle as POST };
