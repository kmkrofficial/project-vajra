"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  UserCog,
  Pencil,
  Trash2,
  Mail,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  inviteEmployeeAction,
  editEmployeeAction,
  removeEmployeeAction,
  resendInviteAction,
} from "@/lib/actions/employees";

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "manager" | "trainer" | "receptionist";
  status: "active" | "invited" | "left";
  branchId: string;
  branchName: string | null;
  userId: string | null;
  createdAt: Date;
}

interface Branch {
  id: string;
  name: string;
}

const ROLE_COLORS: Record<string, "default" | "secondary" | "destructive"> = {
  manager: "default",
  trainer: "secondary",
  receptionist: "secondary",
};

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive"> = {
  active: "default",
  invited: "secondary",
  left: "destructive",
};

export function EmployeesList({
  employees,
  branches,
  isOwner = false,
}: {
  employees: Employee[];
  branches: Branch[];
  isOwner?: boolean;
}) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  function openEdit(emp: Employee) {
    setEditingEmployee(emp);
    setEditOpen(true);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Employees</h1>
          <p className="text-sm text-muted-foreground">
            Invite, manage, and track staff
          </p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
            data-testid="invite-employee-btn"
          >
            <Plus className="size-4" />
            Invite Employee
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Invite Employee</DialogTitle>
              <DialogDescription>
                Send an email invitation with a verification code. The employee
                must sign up and enter the code to join.
              </DialogDescription>
            </DialogHeader>
            <InviteForm branches={branches} onSuccess={() => setInviteOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {employees.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <div className="mb-4 rounded-lg bg-muted p-3">
            <UserCog className="size-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">No employees yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Invite your first employee to start managing your gym staff.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {employees.map((emp) => (
            <EmployeeRow
              key={emp.id}
              emp={emp}
              isOwner={isOwner}
              onEdit={openEdit}
            />
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee details. Changes take effect immediately.
            </DialogDescription>
          </DialogHeader>
          {editingEmployee && (
            <EditForm
              employee={editingEmployee}
              branches={branches}
              onSuccess={() => {
                setEditOpen(false);
                setEditingEmployee(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Employee Row ─────────────────────────────────────────────────────────

function EmployeeRow({
  emp,
  isOwner,
  onEdit,
}: {
  emp: Employee;
  isOwner: boolean;
  onEdit: (emp: Employee) => void;
}) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleRemove() {
    if (!confirm(`Remove ${emp.name}? They will lose access to this gym.`)) return;
    setRemoving(true);
    const result = await removeEmployeeAction(emp.id);
    if (result.success) {
      toast.success(`${emp.name} has been removed.`);
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to remove.");
    }
    setRemoving(false);
  }

  async function handleResend() {
    setResending(true);
    const result = await resendInviteAction(emp.id);
    if (result.success) {
      toast.success(`Invite resent to ${emp.email}`);
    } else {
      toast.error(result.error ?? "Failed to resend.");
    }
    setResending(false);
  }

  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
      data-testid={`employee-row-${emp.id}`}
    >
      <div className="rounded-lg bg-muted p-2">
        <UserCog className="size-4 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {emp.name}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {emp.email}
          {emp.phone ? ` · ${emp.phone}` : ""}
          {emp.branchName ? ` · ${emp.branchName}` : ""}
        </p>
      </div>
      <Badge variant={ROLE_COLORS[emp.role] ?? "secondary"}>
        {emp.role}
      </Badge>
      <Badge variant={STATUS_COLORS[emp.status] ?? "secondary"}>
        {emp.status}
      </Badge>
      {isOwner && (
        <div className="flex items-center gap-1">
          {emp.status === "invited" && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={handleResend}
              disabled={resending}
              title="Resend invite"
              data-testid={`resend-invite-${emp.id}`}
            >
              <RotateCw className={`size-3.5 ${resending ? "animate-spin" : ""}`} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => onEdit(emp)}
            title="Edit employee"
            data-testid={`edit-employee-${emp.id}`}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-destructive hover:text-destructive"
            onClick={handleRemove}
            disabled={removing}
            title="Remove employee"
            data-testid={`remove-employee-${emp.id}`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Invite Form ────────────────────────────────────────────────────────────

function InviteForm({
  branches,
  onSuccess,
}: {
  branches: Branch[];
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await inviteEmployeeAction({
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: (formData.get("phone") as string) || undefined,
      role: selectedRole,
      branchId: selectedBranch,
    });

    if (result.success) {
      toast.success("Invitation sent!");
      onSuccess();
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to invite employee.");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="emp-name">Full Name</Label>
        <Input
          id="emp-name"
          name="name"
          placeholder="John Doe"
          required
          data-testid="emp-name-input"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="emp-email">Email Address</Label>
        <Input
          id="emp-email"
          name="email"
          type="email"
          placeholder="john@example.com"
          required
          data-testid="emp-email-input"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="emp-phone">
          Mobile Number <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="emp-phone"
          name="phone"
          type="tel"
          placeholder="9876543210"
          data-testid="emp-phone-input"
        />
      </div>
      <div className="space-y-2">
        <Label>Role</Label>
        <Select
          value={selectedRole}
          onValueChange={(v) => setSelectedRole(v ?? "")}
        >
          <SelectTrigger data-testid="emp-role-select">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="trainer">Trainer</SelectItem>
            <SelectItem value="receptionist">Receptionist</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Assigned Branch</Label>
        <Select
          value={selectedBranch}
          onValueChange={(v) => setSelectedBranch(v ?? "")}
        >
          <SelectTrigger data-testid="emp-branch-select">
            <SelectValue placeholder="Select branch" />
          </SelectTrigger>
          <SelectContent>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={loading || !selectedRole || !selectedBranch}
        data-testid="emp-submit"
      >
        {loading ? "Sending Invite…" : "Send Invitation"}
      </Button>
    </form>
  );
}

// ─── Edit Form ──────────────────────────────────────────────────────────────

function EditForm({
  employee,
  branches,
  onSuccess,
}: {
  employee: Employee;
  branches: Branch[];
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(employee.name);
  const [email, setEmail] = useState(employee.email);
  const [phone, setPhone] = useState(employee.phone ?? "");
  const [role, setRole] = useState(employee.role);
  const [branchId, setBranchId] = useState(employee.branchId);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const result = await editEmployeeAction(employee.id, {
      name,
      email,
      phone: phone || undefined,
      role,
      branchId,
    });

    if (result.success) {
      toast.success("Employee updated!");
      onSuccess();
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to update.");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-name">Full Name</Label>
        <Input
          id="edit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          data-testid="edit-name-input"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-email">Email Address</Label>
        <Input
          id="edit-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          data-testid="edit-email-input"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-phone">
          Mobile Number <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="edit-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          data-testid="edit-phone-input"
        />
      </div>
      <div className="space-y-2">
        <Label>Role</Label>
        <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
          <SelectTrigger data-testid="edit-role-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="trainer">Trainer</SelectItem>
            <SelectItem value="receptionist">Receptionist</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Assigned Branch</Label>
        <Select value={branchId} onValueChange={(v) => v && setBranchId(v)}>
          <SelectTrigger data-testid="edit-branch-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={loading}
        data-testid="edit-submit"
      >
        {loading ? "Saving…" : "Save Changes"}
      </Button>
    </form>
  );
}
