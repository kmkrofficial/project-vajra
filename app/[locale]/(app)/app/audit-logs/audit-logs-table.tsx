"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: unknown;
  userName: string | null;
  createdAt: string; // ISO string from server
}

export function AuditLogsTable({ logs }: { logs: AuditLog[] }) {
  const t = useTranslations("auditLogs");
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    if (!filter) return logs;
    const lower = filter.toLowerCase();
    return logs.filter(
      (log) =>
        log.action.toLowerCase().includes(lower) ||
        log.entityType.toLowerCase().includes(lower)
    );
  }, [logs, filter]);

  return (
    <div className="space-y-3">
      <Input
        placeholder={t("filterPlaceholder")}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="max-w-sm"
        data-testid="audit-filter"
      />

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("timestamp")}</TableHead>
              <TableHead>{t("action")}</TableHead>
              <TableHead>{t("entity")}</TableHead>
              <TableHead>{t("user")}</TableHead>
              <TableHead>{t("details")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  {logs.length === 0
                    ? t("noLogs")
                    : t("noMatch")}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </TableCell>
                  <TableCell>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">
                    {log.entityType}
                    {log.entityId && (
                      <span className="ml-1 text-muted-foreground">
                        #{log.entityId.slice(0, 8)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {log.userName ?? (
                      <span className="italic text-muted-foreground">System</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-48 truncate text-xs text-muted-foreground">
                    {log.details ? JSON.stringify(log.details) : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("showing", { filtered: filtered.length, total: logs.length })}
      </p>
    </div>
  );
}
