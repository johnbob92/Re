import { connectDB } from "@/lib/db/mongodb";
import { ensureDemoSeed } from "@/lib/db/seed-demo";
import { jsonOk } from "@/lib/api";
import { User } from "@/models";

export async function POST() {
  await connectDB();
  await ensureDemoSeed();
  const count = await User.countDocuments();
  return jsonOk({
    ok: true,
    users: count,
    accounts: {
      superadmin: "superadmin@hireflow.app / SuperAdmin123!",
      admin: "admin@hireflow.app / Password123!",
      hr: "hr@hireflow.app / Password123!",
      tech: "tech@hireflow.app / Password123!",
      candidate: "candidate1@example.com / Password123!",
    },
  });
}
