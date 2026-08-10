import {
  User,
  AdminProfile,
  RecruiterProfile,
  CandidateProfile,
  Interview,
  Assessment,
  NotificationTemplate,
  Connection,
} from "@/models";
import { hashPassword } from "@/lib/auth/password";
import { DEFAULT_NOTIFICATION_TEMPLATES } from "@/data/sample-messages";
import { addHours, subYears } from "date-fns";

let seeding: Promise<void> | null = null;

async function ensureTemplates(userId: string) {
  for (const type of Object.keys(DEFAULT_NOTIFICATION_TEMPLATES) as Array<
    keyof typeof DEFAULT_NOTIFICATION_TEMPLATES
  >) {
    await NotificationTemplate.findOneAndUpdate(
      { userId, type },
      {
        subject: DEFAULT_NOTIFICATION_TEMPLATES[type].subject,
        body: DEFAULT_NOTIFICATION_TEMPLATES[type].body,
      },
      { upsert: true }
    );
  }
}

export async function ensureDemoSeed() {
  if (seeding) return seeding;

  seeding = (async () => {
    const existing = await User.countDocuments({});
    if (existing > 0) return;

    const password = await hashPassword("Password123!");

    await User.create({
      username: "Super Admin",
      email: process.env.SEED_SUPERADMIN_EMAIL || "superadmin@hireflow.app",
      passwordHash: await hashPassword(
        process.env.SEED_SUPERADMIN_PASSWORD || "SuperAdmin123!"
      ),
      role: "superadmin",
      status: "active",
      avatarUrl: "https://api.dicebear.com/9.x/notionists/svg?seed=superadmin",
    });

    const admin = await User.create({
      username: "Ava Admin",
      email: "admin@hireflow.app",
      passwordHash: password,
      role: "admin",
      status: "active",
      avatarUrl: "https://api.dicebear.com/9.x/notionists/svg?seed=admin",
    });

    await AdminProfile.create({
      userId: admin._id,
      companyName: "BrightTalent Labs",
      companyDescription: "We hire exceptional remote engineers for high-growth teams.",
      companyWebsiteUrl: "https://brighttalent.example",
      calendlyUrl: "https://calendly.com/hireflow-final",
      offerLetterTemplateHtml:
        "<h2>Offer Letter</h2><p>Dear {{candidateName}},</p><p>Welcome to BrightTalent Labs!</p>",
    });

    const hr = await User.create({
      username: "Hannah HR",
      email: "hr@hireflow.app",
      passwordHash: password,
      role: "recruiter",
      status: "active",
      adminId: admin._id,
      recruiterType: "hr",
      phone: "+1-555-0101",
      avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=hr",
    });

    const tech = await User.create({
      username: "Theo Tech",
      email: "tech@hireflow.app",
      passwordHash: password,
      role: "recruiter",
      status: "active",
      adminId: admin._id,
      recruiterType: "tech",
      phone: "+1-555-0102",
      avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=tech",
    });

    await RecruiterProfile.create({
      userId: hr._id,
      adminId: admin._id,
      name: "Hannah HR",
      email: "hr@hireflow.app",
      phone: "+1-555-0101",
      location: "New York, USA",
      recruiterType: "hr",
      status: "active",
      salaryType: "monthly",
      salaryRate: 4500,
      paid: true,
      activeStartDate: subYears(new Date(), 1),
      calendlyUrl: "https://calendly.com/hireflow-hr",
      hiredTotal: 12,
      hiredMonthly: 3,
      hiredWeekly: 1,
    });

    await RecruiterProfile.create({
      userId: tech._id,
      adminId: admin._id,
      name: "Theo Tech",
      email: "tech@hireflow.app",
      phone: "+1-555-0102",
      location: "Austin, USA",
      recruiterType: "tech",
      status: "active",
      salaryType: "hourly",
      salaryRate: 45,
      paid: true,
      activeStartDate: subYears(new Date(), 1),
      calendlyUrl: "https://calendly.com/hireflow-tech",
      hiredTotal: 8,
      hiredMonthly: 2,
      hiredWeekly: 1,
    });

    await ensureTemplates(String(hr._id));
    await ensureTemplates(String(tech._id));
    await ensureTemplates(String(admin._id));

    const stacks = ["React", "Node.js", "Python", "AWS", "Go", "Java"];
    const statuses = [
      "need_to_connect",
      "connected",
      "scheduled",
      "hr_pass",
      "hr_failed",
      "tech_pass",
      "tech_failed",
      "final_pass",
      "offer_sent",
      "hired",
    ] as const;

    for (let i = 1; i <= 18; i += 1) {
      const status = statuses[(i - 1) % statuses.length];
      const candUser = await User.create({
        username: `Candidate ${i}`,
        email: `candidate${i}@example.com`,
        passwordHash: password,
        role: "candidate",
        status: "active",
        adminId: admin._id,
        phone: `+1-555-02${String(i).padStart(2, "0")}`,
        avatarUrl: `https://api.dicebear.com/9.x/open-peeps/svg?seed=cand-${i}`,
      });

      const candidate = await CandidateProfile.create({
        userId: candUser._id,
        adminId: admin._id,
        recruiterId: hr._id,
        techRecruiterId: ["tech_pass", "tech_failed", "final_pass", "offer_sent", "hired"].includes(
          status
        )
          ? tech._id
          : undefined,
        name: `Candidate ${i}`,
        email: candUser.email,
        whatsapp: candUser.phone,
        birthday: subYears(new Date(), 22 + (i % 12)),
        location: i % 2 === 0 ? "Remote — EST" : "Toronto, CA",
        linkedinUrl: `https://linkedin.com/in/candidate-${i}`,
        resumeUrl: `https://demo-s3.hireflow.local/resumes/candidate-${i}.pdf`,
        techStack: [stacks[i % stacks.length], stacks[(i + 1) % stacks.length]],
        majorStack: stacks[i % stacks.length],
        experienceYears: 1 + (i % 8),
        status,
        statusHistory: [{ status, at: new Date() }],
        lastAssessmentComment:
          status === "hr_failed" ? "Needs stronger communication clarity." : undefined,
        hrScheduledAt: ["scheduled", "hr_pass", "hr_failed"].includes(status)
          ? addHours(new Date(), 2 + i)
          : undefined,
      });

      if (status !== "need_to_connect") {
        await Connection.create({
          recruiterId: hr._id,
          candidateId: candidate._id,
          adminId: admin._id,
          status: "connected",
          connectedAt: new Date(),
        });
      }

      if (["scheduled", "hr_pass", "hr_failed"].includes(status)) {
        await Interview.create({
          candidateId: candidate._id,
          candidateUserId: candUser._id,
          recruiterId: hr._id,
          adminId: admin._id,
          stage: "hr",
          status: "scheduled",
          scheduledAt: addHours(new Date(), i === 1 ? 0.2 : 2 + i),
          endsAt: addHours(new Date(), i === 1 ? 1 : 3 + i),
          googleMeetLink: `https://meet.google.com/demo-hr-${i}`,
        });

        await Assessment.create({
          candidateId: candidate._id,
          recruiterId: hr._id,
          adminId: admin._id,
          stage: "hr",
          englishLevel: 7,
          communication: 8,
          logistics: 7,
          adaptability: 8,
          confidence: 7,
          problemSolving: 8,
          availableUsEastern: true,
          interestedInRole: true,
          decision: "pending",
          recordingUrl: `https://demo-s3.hireflow.local/recordings/hr-${i}.mp4`,
        });
      }

      if (["hr_pass", "hr_failed"].includes(status)) {
        await Assessment.findOneAndUpdate(
          { candidateId: candidate._id, stage: "hr" },
          {
            decision: status === "hr_pass" ? "pass" : "fail",
            decidedAt: new Date(),
            comment:
              status === "hr_failed"
                ? "Needs stronger communication clarity."
                : "Strong culture fit.",
          },
          { upsert: true }
        );
      }
    }
  })();

  return seeding;
}
