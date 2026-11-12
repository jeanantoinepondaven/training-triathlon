import { redirect } from "next/navigation";

// Sessions are added from the Week screen's Add sheet now.
export default async function AddPage({ searchParams }: PageProps<"/add">) {
  const { date } = await searchParams;
  redirect(typeof date === "string" ? `/week?w=${date}` : "/week");
}
