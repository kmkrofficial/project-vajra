"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, MapPin, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createBranchAction } from "@/lib/actions/branches";

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
                <div className="space-y-2">
                  <Label htmlFor="branch-name">Branch Name</Label>
                  <Input
                    id="branch-name"
                    name="name"
                    placeholder="e.g. Downtown Gym"
                    required
                    data-testid="branch-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch-phone">Contact Phone (optional)</Label>
                  <Input
                    id="branch-phone"
                    name="contactPhone"
                    placeholder="9876543210"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="branch-lat">Latitude</Label>
                    <Input
                      id="branch-lat"
                      name="latitude"
                      placeholder="e.g. 12.9716"
                      inputMode="decimal"
                      data-testid="branch-lat-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branch-lng">Longitude</Label>
                    <Input
                      id="branch-lng"
                      name="longitude"
                      placeholder="e.g. 77.5946"
                      inputMode="decimal"
                      data-testid="branch-lng-input"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Open Google Maps → right-click your gym → copy the Lat/Lng
                  values. Required for geolocation-based attendance.
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
