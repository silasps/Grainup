"use server";
import { NextResponse } from "next/server";
import { getBlingPaymentForms } from "@/lib/bling/client";

export async function GET() {
  try {
    const forms = await getBlingPaymentForms();
    return NextResponse.json({ ok: true, total: forms.length, forms });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
