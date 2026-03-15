"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, MapPin, GitBranch, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FormField } from "@/components/ui/form-field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createBranchAction, updateBranchAction } from "@/lib/actions/branches";

interface Branch {
  id: string;
  name: string;
  contactPhone: string | null;
  latitude: string | null;
  longitude: string | null;
  createdAt: Date;
}

export function BranchesList({
  branches,
  isOwner,
}: {
  branches: Branch[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await createBranchAction({
      name: formData.get("name") as string,
      contactPhone: (formData.get("contactPhone") as string) || undefined,
      latitude: (formData.get("latitude") as string) || undefined,
      longitude: (formData.get("longitude") as string) || undefined,
    });

    if (result.success) {
      toast.success("Branch created!");
      setOpen(false);
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to create branch.");
    }
    setLoading(false);
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editBranch) return;
    setEditLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await updateBranchAction(editBranch.id, {
      name: formData.get("name") as string,
      contactPhone: (formData.get("contactPhone") as string) || undefined,
      latitude: (formData.get("latitude") as string) || undefined,
      longitude: (formData.get("longitude") as string) || undefined,
    });

    if (result.success) {
      toast.success("Branch updated!");
      setEditBranch(null);
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to update branch.");
    }
    setEditLoading(false);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Branches</h1>
          <p className="text-sm text-muted-foreground">
            Manage your gym locations
          </p>
        </div>
        {isOwner && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
              data-testid="create-branch-btn"
            >
              <Plus className="size-4" />
              Create Branch
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Branch</DialogTitle>
                <DialogDescription>
                  Add a new gym location. Coordinates enable geolocation-based
                  staff attendance.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <FormField
                  label="Branch Name"
                  htmlFor="branch-name"
                  required
                  tooltip="Unique name for this gym location"
                  constraint="Min 2 characters"
                >
                  <Input
                    id="branch-name"
                    name="name"
                    placeholder="e.g. Downtown Gym"
                    required
                    data-testid="branch-name-input"
                  />
                </FormField>

                <FormField
                  label="Contact Phone"
                  htmlFor="branch-phone"
                  optional
                  tooltip="Public phone number for this branch"
                  constraint="10-digit Indian mobile number"
                >
                  <Input
                    id="branch-phone"
                    name="contactPhone"
                    placeholder="9876543210"
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    label="Latitude"
                    htmlFor="branch-lat"
                    tooltip="Decimal latitude for geolocation-based attendance"
                    constraint="e.g. 12.9716"
                  >
                    <Input
                      id="branch-lat"
                      name="latitude"
                      placeholder="e.g. 12.9716"
                      inputMode="decimal"
                      data-testid="branch-lat-input"
                    />
                  </FormField>
                  <FormField
                    label="Longitude"
                    htmlFor="branch-lng"
                    tooltip="Decimal longitude for geolocation-based attendance"
                    constraint="e.g. 77.5946"
                  >
                    <Input
                      id="branch-lng"
                      name="longitude"
                      placeholder="e.g. 77.5946"
                      inputMode="decimal"
                      data-testid="branch-lng-input"
                    />
                  </FormField>
                </div>
                <p className="text-xs text-muted-foreground">
                  Open Google Maps → right-click your gym → copy the Lat/Lng values.
                </p>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                  data-testid="branch-submit"
                >
                  {loading ? "Creating…" : "Create Branch"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {branches.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <div className="mb-4 rounded-lg bg-muted p-3">
            <GitBranch className="size-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">No branches yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Create your first branch to manage multiple gym locations.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
              data-testid={`branch-row-${branch.id}`}
            >
              <div className="rounded-lg bg-muted p-2">
                <GitBranch className="size-4 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {branch.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {branch.contactPhone || "No phone"}
                </p>
              </div>
              {branch.latitude && branch.longitude ? (
                <Badge variant="secondary" className="gap-1">
                  <MapPin className="size-3" strokeWidth={1.5} />
                  GPS Set
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1 text-xs">
                  No GPS
                </Badge>
              )}
              {isOwner && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditBranch(branch)}
                  data-testid={`edit-branch-${branch.id}`}
                >
                  <Pencil className="size-3.5" strokeWidth={1.5} />
                  Edit
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editBranch} onOpenChange={(open) => !open && setEditBranch(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Branch</DialogTitle>
            <DialogDescription>
              Update branch details. Coordinate changes affect geolocation-based attendance.
            </DialogDescription>
          </DialogHeader>
          {editBranch && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <FormField
                label="Branch Name"
                htmlFor="edit-branch-name"
                required
                tooltip="Unique name for this gym location"
                constraint="Min 2 characters"
              >
                <Input
                  id="edit-branch-name"
                  name="name"
                  defaultValue={editBranch.name}
                  required
                  data-testid="edit-branch-name"
                />
              </FormField>

              <FormField
                label="Contact Phone"
                htmlFor="edit-branch-phone"
                optional
                tooltip="Public phone number for this branch"
                constraint="10-digit Indian mobile number"
              >
                <Input
                  id="edit-branch-phone"
                  name="contactPhone"
                  defaultValue={editBranch.contactPhone ?? ""}
                  placeholder="9876543210"
                  data-testid="edit-branch-phone"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label="Latitude"
                  htmlFor="edit-branch-lat"
                  tooltip="Decimal latitude for geolocation-based attendance"
                  constraint="e.g. 12.9716"
                >
                  <Input
                    id="edit-branch-lat"
                    name="latitude"
                    defaultValue={editBranch.latitude ?? ""}
                    placeholder="e.g. 12.9716"
                    inputMode="decimal"
                    data-testid="edit-branch-lat"
                  />
                </FormField>
                <FormField
                  label="Longitude"
                  htmlFor="edit-branch-lng"
                  tooltip="Decimal longitude for geolocation-based attendance"
                  constraint="e.g. 77.5946"
                >
                  <Input
                    id="edit-branch-lng"
                    name="longitude"
                    defaultValue={editBranch.longitude ?? ""}
                    placeholder="e.g. 77.5946"
                    inputMode="decimal"
                    data-testid="edit-branch-lng"
                  />
                </FormField>
              </div>
              <p className="text-xs text-muted-foreground">
                Open Google Maps → right-click your gym → copy the Lat/Lng values.
              </p>

              <Button
                type="submit"
                className="w-full"
                disabled={editLoading}
                data-testid="submit-edit-branch"
              >
                {editLoading ? "Saving…" : "Save Changes"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
