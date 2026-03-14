"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, UserCog } from "lucide-react";
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
import { addEmployeeAction } from "@/lib/actions/employees";

interface Employee {
  id: string;
  name: string;
  role: "manager" | "trainer" | "receptionist";
  status: "active" | "invited";
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

export function EmployeesList({
  employees,
  branches,
}: {
  employees: Employee[];
  branches: Branch[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await addEmployeeAction({
      name: formData.get("name") as string,
      role: selectedRole,
      branchId: selectedBranch,
    });

    if (result.success) {
      toast.success("Employee added!");
      setOpen(false);
      setSelectedRole("");
      setSelectedBranch("");
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to add employee.");
    }
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Employees</h1>
          <p className="text-sm text-muted-foreground">
            Manage staff and track attendance
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
            data-testid="add-employee-btn"
          >
            <Plus className="size-4" />
            Add Employee
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Employee</DialogTitle>
              <DialogDescription>
                Create a staff record. They will appear as &ldquo;Invited&rdquo;
                until linked to a user account.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
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
                {loading ? "Adding…" : "Add Employee"}
              </Button>
            </form>
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
            Add your first employee to start managing staff attendance.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {employees.map((emp) => (
            <div
              key={emp.id}
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
                <p className="text-xs text-muted-foreground">
                  {emp.branchName || "No branch"}
                </p>
              </div>
              <Badge variant={ROLE_COLORS[emp.role] ?? "secondary"}>
                {emp.role}
              </Badge>
              <Badge variant={emp.status === "active" ? "default" : "secondary"}>
                {emp.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
