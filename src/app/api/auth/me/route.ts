import { withAuth, jsonOk } from "@/lib/api";

export async function GET() {
  return withAuth(null, async (user) => jsonOk({ user }));
}
