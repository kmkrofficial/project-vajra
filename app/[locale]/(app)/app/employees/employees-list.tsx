"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
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
import { Badge } from "@/components/ui/badge";
import { FormField } from "@/components/ui/form-field";
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
  assignedBranchIds: string[];
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
  const t = useTranslations("employees");
  const tr = useTranslations("roles");
  const ts = useTranslations("status");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const branchMap = new Map(branches.map((b) => [b.id, b.name]));

  function openEdit(emp: Employee) {
    setEditingEmployee(emp);
    setEditOpen(true);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
            data-testid="invite-employee-btn"
          >
            <Plus className="size-4" />
            {t("inviteEmployee")}
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("inviteDialogTitle")}</DialogTitle>
              <DialogDescription>
                {t("inviteDialogDescription")}
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
          <h2 className="text-lg font-semibold">{t("noEmployees")}</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {t("noEmployeesDescription")}
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
              branchMap={branchMap}
            />
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("editDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("editDialogDescription")}
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
  branchMap,
}: {
  emp: Employee;
  isOwner: boolean;
  onEdit: (emp: Employee) => void;
  branchMap: Map<string, string>;
}) {
  const t = useTranslations("employees");
  const tr = useTranslations("roles");
  const ts = useTranslations("status");
  const router = useRouter();
  const [removing, setRemoving] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleRemove() {
    if (!confirm(t("confirmRemove", { name: emp.name }))) return;
    setRemoving(true);
    const result = await removeEmployeeAction(emp.id);
    if (result.success) {
      toast.success(t("removed", { name: emp.name }));
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
      toast.success(t("inviteResent", { email: emp.email }));
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
        </p>
        {emp.assignedBranchIds.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-1">
            {emp.assignedBranchIds.map((bid) => (
              <span key={bid} className="inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {branchMap.get(bid) ?? "Unknown"}
              </span>
            ))}
          </div>
        )}
      </div>
      <Badge variant={ROLE_COLORS[emp.role] ?? "secondary"}>
        {tr(emp.role)}
      </Badge>
      <Badge variant={STATUS_COLORS[emp.status] ?? "secondary"}>
        {ts(emp.status)}
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
            title={t("resendInvite")}
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
            title={t("editEmployee")}
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
            title={t("removeEmployee")}
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
  const t = useTranslations("employees");
  const tr = useTranslations("roles");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);

  function toggleBranch(id: string) {
    setSelectedBranches((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await inviteEmployeeAction({
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: (formData.get("phone") as string) || undefined,
      role: selectedRole,
      branchId: selectedBranches[0] ?? "",
      branchIds: selectedBranches,
    });

    if (result.success) {
      toast.success(t("inviteSent"));
      onSuccess();
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to invite employee.");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField
        label={t("inviteForm.name")}
        htmlFor="emp-name"
        required
        tooltip={t("inviteForm.nameTooltip")}
        constraint={t("inviteForm.nameConstraint")}
      >
        <Input
          id="emp-name"
          name="name"
          placeholder={t("inviteForm.namePlaceholder")}
          required
          data-testid="emp-name-input"
        />
      </FormField>

      <FormField
        label={t("inviteForm.email")}
        htmlFor="emp-email"
        required
        tooltip={t("inviteForm.emailTooltip")}
      >
        <Input
          id="emp-email"
          name="email"
          type="email"
          placeholder={t("inviteForm.emailPlaceholder")}
          required
          data-testid="emp-email-input"
        />
      </FormField>

      <FormField
        label={t("inviteForm.phone")}
        htmlFor="emp-phone"
        optional
        tooltip={t("inviteForm.phoneTooltip")}
        constraint={t("inviteForm.phoneConstraint")}
      >
        <Input
          id="emp-phone"
          name="phone"
          type="tel"
          placeholder={t("inviteForm.phonePlaceholder")}
          data-testid="emp-phone-input"
        />
      </FormField>

      <FormField
        label={t("inviteForm.role")}
        required
        tooltip={t("inviteForm.roleTooltip")}
      >
        <Select
          value={selectedRole}
          onValueChange={(v) => setSelectedRole(v ?? "")}
        >
          <SelectTrigger data-testid="emp-role-select">
            <SelectValue placeholder={t("inviteForm.selectRole")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manager">{tr("manager")}</SelectItem>
            <SelectItem value="trainer">{tr("trainer")}</SelectItem>
            <SelectItem value="receptionist">{tr("receptionist")}</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      <FormField
        label={t("inviteForm.assignedBranches")}
        required
        tooltip={t("inviteForm.branchesTooltip")}
        constraint={t("inviteForm.branchesConstraint")}
      >
        <div className="rounded-lg border border-input p-2 space-y-1" data-testid="emp-branch-select">
          {branches.map((b) => (
            <label
              key={b.id}
              className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedBranches.includes(b.id)}
                onChange={() => toggleBranch(b.id)}
                className="size-4 rounded border-input accent-primary"
              />
              {b.name}
            </label>
          ))}
          {branches.length === 0 && (
            <p className="text-xs text-muted-foreground py-1">{t("inviteForm.noBranches")}</p>
          )}
        </div>
      </FormField>

      <Button
        type="submit"
        className="w-full"
        disabled={loading || !selectedRole || selectedBranches.length === 0}
        data-testid="emp-submit"
      >
        {loading ? t("inviteForm.sendingInvite") : t("inviteForm.sendInvitation")}
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
  const t = useTranslations("employees");
  const tr = useTranslations("roles");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(employee.name);
  const [email, setEmail] = useState(employee.email);
  const [phone, setPhone] = useState(employee.phone ?? "");
  const [role, setRole] = useState(employee.role);
  const [selectedBranches, setSelectedBranches] = useState<string[]>(
    employee.assignedBranchIds.length > 0
      ? employee.assignedBranchIds
      : [employee.branchId]
  );

  function toggleBranch(id: string) {
    setSelectedBranches((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const result = await editEmployeeAction(employee.id, {
      name,
      email,
      phone: phone || undefined,
      role,
      branchId: selectedBranches[0] ?? employee.branchId,
      branchIds: selectedBranches,
    });

    if (result.success) {
      toast.success(t("employeeUpdated"));
      onSuccess();
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to update.");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField
        label={t("inviteForm.name")}
        htmlFor="edit-name"
        required
        tooltip={t("inviteForm.nameTooltip")}
        constraint={t("inviteForm.nameConstraint")}
      >
        <Input
          id="edit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          data-testid="edit-name-input"
        />
      </FormField>

      <FormField
        label={t("inviteForm.email")}
        htmlFor="edit-email"
        required
        tooltip={t("inviteForm.emailTooltip")}
      >
        <Input
          id="edit-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          data-testid="edit-email-input"
        />
      </FormField>

      <FormField
        label={t("inviteForm.phone")}
        htmlFor="edit-phone"
        optional
        tooltip={t("inviteForm.phoneTooltip")}
        constraint={t("inviteForm.phoneConstraint")}
      >
        <Input
          id="edit-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          data-testid="edit-phone-input"
        />
      </FormField>

      <FormField
        label={t("inviteForm.role")}
        required
        tooltip={t("inviteForm.roleTooltip")}
      >
        <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
          <SelectTrigger data-testid="edit-role-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manager">{tr("manager")}</SelectItem>
            <SelectItem value="trainer">{tr("trainer")}</SelectItem>
            <SelectItem value="receptionist">{tr("receptionist")}</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      <FormField
        label={t("inviteForm.assignedBranches")}
        required
        tooltip={t("inviteForm.branchesTooltip")}
        constraint={t("inviteForm.branchesConstraint")}
      >
        <div className="rounded-lg border border-input p-2 space-y-1" data-testid="edit-branch-select">
          {branches.map((b) => (
            <label
              key={b.id}
              className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedBranches.includes(b.id)}
                onChange={() => toggleBranch(b.id)}
                className="size-4 rounded border-input accent-primary"
              />
              {b.name}
            </label>
          ))}
        </div>
      </FormField>

      <Button
        type="submit"
        className="w-full"
        disabled={loading || selectedBranches.length === 0}
        data-testid="edit-submit"
      >
        {loading ? t("editForm.saving") : t("editForm.saveChanges")}
      </Button>
    </form>
  );
}
