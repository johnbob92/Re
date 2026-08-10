"use client";

import { FormEvent, useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Table, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { RecruiterStatusBadge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils/dates";

interface RecruiterRow {
  _id: string;
  name: string;
  location?: string;
  email: string;
  phone?: string;
  recruiterType: "hr" | "tech";
  performance: number;
  salaryType: "monthly" | "hourly";
  salaryRate: number;
  paid: boolean;
  activeStartDate?: string;
  status: "active" | "decline" | "invited";
}

export default function AdminRecruitersPage() {
  const [items, setItems] = useState<RecruiterRow[]>([]);
  const [performanceView, setPerformanceView] = useState("total");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    recruiterType: "hr",
    salaryType: "monthly",
    salaryRate: "4000",
    paid: false,
    calendlyUrl: "",
  });

  async function load(view = performanceView) {
    const res = await fetch(`/api/recruiters?performanceView=${view}`);
    const data = await res.json();
    setItems(data.items || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    await fetch("/api/recruiters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        salaryRate: Number(form.salaryRate),
        status: "invited",
      }),
    });
    setForm({
      name: "",
      email: "",
      phone: "",
      location: "",
      recruiterType: "hr",
      salaryType: "monthly",
      salaryRate: "4000",
      paid: false,
      calendlyUrl: "",
    });
    load();
  }

  async function togglePaid(row: RecruiterRow) {
    await fetch("/api/recruiters", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row._id, paid: !row.paid }),
    });
    load();
  }

  return (
    <DashboardShell
      title="Recruiters"
      subtitle="HR and Technical recruiters with performance, salary, and status controls"
      actions={
        <Select
          value={performanceView}
          onChange={(e) => {
            setPerformanceView(e.target.value);
            load(e.target.value);
          }}
          className="w-40"
        >
          <option value="weekly">Weekly hired</option>
          <option value="monthly">Monthly hired</option>
          <option value="total">Total hired</option>
        </Select>
      }
    >
      <Card className="mb-6">
        <h3 className="mb-3 font-semibold">Invite / add recruiter</h3>
        <form onSubmit={onCreate} className="grid gap-3 md:grid-cols-3">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Location">
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </Field>
          <Field label="Role">
            <Select value={form.recruiterType} onChange={(e) => setForm({ ...form, recruiterType: e.target.value })}>
              <option value="hr">HR</option>
              <option value="tech">Tech</option>
            </Select>
          </Field>
          <Field label="Salary Type">
            <Select value={form.salaryType} onChange={(e) => setForm({ ...form, salaryType: e.target.value })}>
              <option value="monthly">Monthly</option>
              <option value="hourly">Hourly</option>
            </Select>
          </Field>
          <Field label="Salary Rate">
            <Input type="number" value={form.salaryRate} onChange={(e) => setForm({ ...form, salaryRate: e.target.value })} />
          </Field>
          <Field label="Calendly URL">
            <Input value={form.calendlyUrl} onChange={(e) => setForm({ ...form, calendlyUrl: e.target.value })} />
          </Field>
          <div className="flex items-end">
            <Button type="submit" className="w-full">Add recruiter</Button>
          </div>
        </form>
      </Card>

      <Table
        headers={[
          "Name",
          "Location",
          "Email",
          "Phone",
          "Role",
          "Performance",
          "Salary",
          "Paid",
          "Active Duration",
          "Status",
        ]}
      >
        {items.map((r) => (
          <tr key={r._id}>
            <Td className="font-medium">{r.name}</Td>
            <Td>{r.location || "—"}</Td>
            <Td>{r.email}</Td>
            <Td>{r.phone || "—"}</Td>
            <Td className="uppercase">{r.recruiterType}</Td>
            <Td>{r.performance}</Td>
            <Td>
              {r.salaryType} / {r.salaryRate}
            </Td>
            <Td>
              <Button size="sm" variant={r.paid ? "success" : "secondary"} onClick={() => togglePaid(r)}>
                {r.paid ? "True" : "False"}
              </Button>
            </Td>
            <Td>{formatDate(r.activeStartDate)}</Td>
            <Td>
              <RecruiterStatusBadge status={r.status} />
            </Td>
          </tr>
        ))}
      </Table>
    </DashboardShell>
  );
}
