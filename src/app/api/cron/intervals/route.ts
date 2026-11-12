import { connectedUserIds, pullActivities } from "@/lib/intervals";

// Daily pull for everyone connected (Vercel Cron, see vercel.json). Vercel sends
// "Authorization: Bearer $CRON_SECRET" when the CRON_SECRET variable is set.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const results: Record<string, unknown> = {};
  for (const id of await connectedUserIds()) {
    try {
      results[id.slice(0, 8)] = await pullActivities(id);
    } catch (e) {
      results[id.slice(0, 8)] = { error: (e as Error).message };
    }
  }
  return Response.json({ ok: true, results });
}
