import { redirect } from "next/navigation";

interface Props {
  searchParams: Promise<{ code?: string; next?: string }>;
}

export default async function Home({ searchParams }: Props) {
  const params = await searchParams;
  if (params.code) {
    const next = params.next ? `&next=${encodeURIComponent(params.next)}` : "";
    redirect(`/auth/callback?code=${params.code}${next}`);
  }
  redirect("/editora");
}
