import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, withAuth } from "@/lib/api";
import { CandidateProfile, User } from "@/models";
import { hashPassword } from "@/lib/auth/password";
import { parseCsv, rowsToObjects } from "@/lib/utils/csv-parse";
import { writeAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";

const bodySchema = z.object({
  csv: z.string().min(10),
  defaultPassword: z.string().min(8).default("Candidate123!"),
});

function pick(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    if (row[key]) return row[key];
  }
  return "";
}

export async function POST(req: NextRequest) {
  return withAuth(["admin"], async (user) => {
    const body = bodySchema.parse(await req.json());
    const rows = rowsToObjects(parseCsv(body.csv));
    if (!rows.length) return jsonError("No data rows found in CSV");

    const created: string[] = [];
    const skipped: Array<{ email: string; reason: string }> = [];
    const passwordHash = await hashPassword(body.defaultPassword);

    for (const row of rows) {
      const email = pick(row, ["email", "email address", "emailaddress"]).toLowerCase();
      const name = pick(row, ["name", "candidate name", "candidatename", "username"]);
      if (!email || !name) {
        skipped.push({ email: email || "(missing)", reason: "name/email required" });
        continue;
      }

      const exists = await User.findOne({ email });
      if (exists) {
        skipped.push({ email, reason: "already exists" });
        continue;
      }

      const account = await User.create({
        username: name,
        email,
        passwordHash,
        role: "candidate",
        status: "active",
        adminId: user.id,
        phone: pick(row, ["whatsapp", "phone", "phone number"]),
        avatarUrl: `https://api.dicebear.com/9.x/open-peeps/svg?seed=${encodeURIComponent(name)}`,
      });

      const techStackRaw = pick(row, ["techstack", "tech stack", "skills"]);
      const techStack = techStackRaw
        ? techStackRaw.split(/[|,]/).map((s) => s.trim()).filter(Boolean)
        : [];

      await CandidateProfile.create({
        userId: account._id,
        adminId: user.id,
        name,
        email,
        whatsapp: pick(row, ["whatsapp", "phone"]),
        phone: pick(row, ["phone", "whatsapp"]),
        location: pick(row, ["location", "address", "city"]),
        linkedinUrl: pick(row, ["linkedin", "linkedin url", "linkedinurl"]),
        resumeUrl: pick(row, ["resume", "resume url", "resumeurl"]),
        techStack,
        majorStack: pick(row, ["majorstack", "major stack", "stack"]) || techStack[0],
        experienceYears: Number(pick(row, ["experience", "experience years", "experienceyears"]) || 0),
        status: "need_to_connect",
        statusHistory: [{ status: "need_to_connect", at: new Date(), note: "CSV import" }],
      });

      created.push(email);
    }

    await writeAudit({
      actor: user,
      action: "candidate.import",
      entityType: "candidate",
      summary: `${user.username} imported ${created.length} candidates (${skipped.length} skipped)`,
      meta: { createdCount: created.length, skippedCount: skipped.length },
      adminId: user.id,
    });

    await notifyUser({
      userId: user.id,
      type: "import.complete",
      title: "CSV import finished",
      body: `Created ${created.length} candidates, skipped ${skipped.length}.`,
      href: "/admin/candidates",
    });

    return jsonOk({
      createdCount: created.length,
      skippedCount: skipped.length,
      created,
      skipped,
      defaultPassword: body.defaultPassword,
    });
  }, { req, rateLimit: { limit: 10, windowMs: 60_000, suffix: "candidate-import" } });
}

export async function GET() {
  return withAuth(["admin"], async () =>
    jsonOk({
      template:
        "name,email,whatsapp,location,linkedin,resume,techstack,majorstack,experience\n" +
        "Jane Doe,jane@example.com,+1-555-0100,Remote EST,https://linkedin.com/in/jane,https://demo-s3.hireflow.local/resumes/jane.pdf,\"React|Node.js\",React,4\n",
      requiredHeaders: ["name", "email"],
      optionalHeaders: [
        "whatsapp",
        "phone",
        "location",
        "linkedin",
        "resume",
        "techstack",
        "majorstack",
        "experience",
      ],
    })
  );
}
