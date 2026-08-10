"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Table, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { UserRole } from "@/types";

interface ManagedUser {
  _id: string;
  username: string;
  email: string;
  role: UserRole;
  status: string;
}

export default function SuperAdminManagingPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [selected, setSelected] = useState<ManagedUser | null>(null);
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("candidate");
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/users?pageSize=100");
    const data = await res.json();
    setUsers(data.items || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function patch(payload: Record<string, unknown>) {
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Action failed");
      return;
    }
    setMessage("Updated successfully");
    setSelected(null);
    setPassword("");
    load();
  }

  return (
    <DashboardShell
      title="User Management"
      subtitle="Reset passwords, change roles, and delete accounts across the platform"
    >
      {message ? <p className="mb-3 text-sm text-[var(--primary)]">{message}</p> : null}
      <Table headers={["Username", "Email", "Role", "Status", "Actions"]}>
        {users.map((u) => (
          <tr key={u._id}>
            <Td className="font-medium">{u.username}</Td>
            <Td>{u.email}</Td>
            <Td className="capitalize">{u.role}</Td>
            <Td className="capitalize">{u.status}</Td>
            <Td>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setSelected(u);
                  setRole(u.role);
                }}
              >
                Manage
              </Button>
            </Td>
          </tr>
        ))}
      </Table>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={`Manage ${selected?.username || ""}`}
        footer={
          <>
            <Button
              variant="danger"
              onClick={() => selected && patch({ userId: selected._id, deleteAccount: true })}
            >
              Delete account
            </Button>
            <Button
              onClick={() =>
                selected &&
                patch({
                  userId: selected._id,
                  role,
                  password: password || undefined,
                  status: "active",
                })
              }
            >
              Save changes
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Role">
            <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              <option value="superadmin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="recruiter">Recruiter</option>
              <option value="candidate">Candidate</option>
            </Select>
          </Field>
          <Field label="Reset password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave empty to keep current password"
            />
          </Field>
        </div>
      </Modal>
    </DashboardShell>
  );
}
