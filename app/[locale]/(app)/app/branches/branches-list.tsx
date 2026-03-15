"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("branches");
  const tc = useTranslations("common");
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
      toast.success(t("branchCreated"));
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
      toast.success(t("branchUpdated"));
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
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        {isOwner && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
              data-testid="create-branch-btn"
            >
              <Plus className="size-4" />
              {t("createBranch")}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t("createDialogTitle")}</DialogTitle>
                <DialogDescription>
                  {t("createDialogDescription")}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <FormField
                  label={t("branchName")}
                  htmlFor="branch-name"
                  required
                  tooltip={t("branchNameTooltip")}
                  constraint={t("branchNameConstraint")}
                >
                  <Input
                    id="branch-name"
                    name="name"
                    placeholder={t("branchNamePlaceholder")}
                    required
                    data-testid="branch-name-input"
                  />
                </FormField>

                <FormField
                  label={t("contactPhone")}
                  htmlFor="branch-phone"
                  optional
                  tooltip={t("contactPhoneTooltip")}
                  constraint={t("contactPhoneConstraint")}
                >
                  <Input
                    id="branch-phone"
                    name="contactPhone"
                    placeholder={t("contactPhonePlaceholder")}
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    label={t("latitude")}
                    htmlFor="branch-lat"
                    tooltip={t("latitudeTooltip")}
                    constraint={t("latitudePlaceholder")}
                  >
                    <Input
                      id="branch-lat"
                      name="latitude"
                      placeholder={t("latitudePlaceholder")}
                      inputMode="decimal"
                      data-testid="branch-lat-input"
                    />
                  </FormField>
                  <FormField
                    label={t("longitude")}
                    htmlFor="branch-lng"
                    tooltip={t("longitudeTooltip")}
                    constraint={t("longitudePlaceholder")}
                  >
                    <Input
                      id="branch-lng"
                      name="longitude"
                      placeholder={t("longitudePlaceholder")}
                      inputMode="decimal"
                      data-testid="branch-lng-input"
                    />
                  </FormField>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("gpsHelp")}
                </p>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                  data-testid="branch-submit"
                >
                  {loading ? t("creating") : t("createBranch")}
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
          <h2 className="text-lg font-semibold">{t("noBranches")}</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {t("noBranchesDescription")}
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
                  {branch.contactPhone || tc("noPhone")}
                </p>
              </div>
              {branch.latitude && branch.longitude ? (
                <Badge variant="secondary" className="gap-1">
                  <MapPin className="size-3" strokeWidth={1.5} />
                  {t("gpsSet")}
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1 text-xs">
                  {t("noGps")}
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
            <DialogTitle>{t("editDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("editDialogDescription")}
            </DialogDescription>
          </DialogHeader>
          {editBranch && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <FormField
                label={t("branchName")}
                htmlFor="edit-branch-name"
                required
                tooltip={t("branchNameTooltip")}
                constraint={t("branchNameConstraint")}
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
                label={t("contactPhone")}
                htmlFor="edit-branch-phone"
                optional
                tooltip={t("contactPhoneTooltip")}
                constraint={t("contactPhoneConstraint")}
              >
                <Input
                  id="edit-branch-phone"
                  name="contactPhone"
                  defaultValue={editBranch.contactPhone ?? ""}
                  placeholder={t("contactPhonePlaceholder")}
                  data-testid="edit-branch-phone"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label={t("latitude")}
                  htmlFor="edit-branch-lat"
                  tooltip={t("latitudeTooltip")}
                  constraint={t("latitudePlaceholder")}
                >
                  <Input
                    id="edit-branch-lat"
                    name="latitude"
                    defaultValue={editBranch.latitude ?? ""}
                    placeholder={t("latitudePlaceholder")}
                    inputMode="decimal"
                    data-testid="edit-branch-lat"
                  />
                </FormField>
                <FormField
                  label={t("longitude")}
                  htmlFor="edit-branch-lng"
                  tooltip={t("longitudeTooltip")}
                  constraint={t("longitudePlaceholder")}
                >
                  <Input
                    id="edit-branch-lng"
                    name="longitude"
                    defaultValue={editBranch.longitude ?? ""}
                    placeholder={t("longitudePlaceholder")}
                    inputMode="decimal"
                    data-testid="edit-branch-lng"
                  />
                </FormField>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("gpsHelp")}
              </p>

              <Button
                type="submit"
                className="w-full"
                disabled={editLoading}
                data-testid="submit-edit-branch"
              >
                {editLoading ? tc("saving") : tc("saveChanges")}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
