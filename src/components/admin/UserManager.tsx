"use client";

import { useCallback, useEffect, useId, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  KeyRound,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

import { ApiError, apiRequest } from "@/lib/client-api";
import { cn, SITE_TIME_ZONE } from "@/lib/utils";
import { ROLE_LABELS, type AdminRole } from "@/lib/rbac";
import type { FieldErrors } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/surface";
import { Field, Input, NativeSelect } from "@/components/ui/field";
import { SwitchRow } from "@/components/ui/switch";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableWrapper,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  avatarUrl: string;
  isActive: boolean;
  lastLoginAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: SITE_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type Draft = {
  name: string;
  email: string;
  password: string;
  role: AdminRole;
  isActive: boolean;
};

const emptyDraft: Draft = {
  name: "",
  email: "",
  password: "",
  role: "ADMIN",
  isActive: true,
};

export function UserManager({
  users,
  total,
  page,
  pageCount,
  query,
  currentUserId,
}: {
  users: AdminUser[];
  total: number;
  page: number;
  pageCount: number;
  query: string;
  /** Used to grey out the actions that would lock this person out of the panel. */
  currentUserId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchId = useId();

  const [search, setSearch] = useState(query);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AdminUser | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resetting, setResetting] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [, startNavigation] = useTransition();

  useEffect(() => setSearch(query), [query]);

  /** Search and pagination live in the URL, so a filtered list is shareable. */
  const navigate = useCallback(
    (next: { q?: string; page?: number }) => {
      const params = new URLSearchParams(searchParams.toString());

      if (next.q !== undefined) {
        if (next.q) params.set("q", next.q);
        else params.delete("q");
        params.delete("page");
      }

      if (next.page !== undefined) {
        if (next.page > 1) params.set("page", String(next.page));
        else params.delete("page");
      }

      const qs = params.toString();
      startNavigation(() => router.push(qs ? `/admin/users?${qs}` : "/admin/users"));
    },
    [router, searchParams]
  );

  function openCreate() {
    setEditing(null);
    setDraft(emptyDraft);
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(user: AdminUser) {
    setEditing(user);
    setDraft({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      isActive: user.isActive,
    });
    setErrors({});
    setDialogOpen(true);
  }

  const patch = (values: Partial<Draft>) =>
    setDraft((current) => ({ ...current, ...values }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setErrors({});

    try {
      if (editing) {
        await apiRequest(`/api/admins/${editing.id}`, {
          method: "PUT",
          body: {
            name: draft.name,
            email: draft.email,
            role: draft.role,
            isActive: draft.isActive,
            avatarUrl: editing.avatarUrl,
            updatedAt: editing.updatedAt,
          },
        });
        toast.success("Account updated");
      } else {
        await apiRequest("/api/admins", {
          method: "POST",
          body: { ...draft, avatarUrl: "" },
        });
        toast.success("Account created");
      }

      setDialogOpen(false);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fields);
        toast.error(error.message);
        if (error.status === 409) router.refresh();
      } else {
        toast.error("Could not save. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  /** Enable / disable, from the row rather than the dialog. */
  async function toggleActive(user: AdminUser) {
    setBusyId(user.id);
    try {
      await apiRequest(`/api/admins/${user.id}`, {
        method: "PUT",
        body: {
          name: user.name,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatarUrl,
          isActive: !user.isActive,
          updatedAt: user.updatedAt,
        },
      });
      toast.success(user.isActive ? "Account disabled" : "Account enabled");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not change the account."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setBusyId(pendingDelete.id);
    try {
      await apiRequest(`/api/admins/${pendingDelete.id}`, { method: "DELETE" });
      toast.success("Account deleted");
      setPendingDelete(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not delete.");
    } finally {
      setBusyId(null);
    }
  }

  async function submitReset(event: React.FormEvent) {
    event.preventDefault();
    if (!resetting || saving) return;

    setSaving(true);
    setErrors({});
    try {
      await apiRequest(`/api/admins/${resetting.id}/password`, {
        method: "PUT",
        body: { password: newPassword },
      });
      toast.success(`Password reset for ${resetting.email}`);
      setResetting(null);
      setNewPassword("");
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fields);
        toast.error(error.message);
      } else {
        toast.error("Could not reset the password.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            navigate({ q: search.trim() });
          }}
          role="search"
          className="relative w-full sm:max-w-xs"
        >
          <label htmlFor={searchId} className="sr-only">
            Search accounts
          </label>
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-fog"
          />
          <input
            id={searchId}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or email…"
            className="h-9 w-full rounded-full border border-white/10 bg-ink-800/60 pr-3 pl-10 text-sm text-foam placeholder:text-fog focus:border-volt/60 focus:outline-none"
          />
        </form>

        <Button variant="gold" size="sm" onClick={openCreate}>
          <Plus aria-hidden />
          Add account
        </Button>
      </div>

      <Card>
        {users.length === 0 ? (
          <div className="grid place-items-center gap-3 px-6 py-16 text-center">
            <p className="text-sm font-semibold text-foam">No accounts match</p>
            <p className="max-w-sm text-sm text-mist">
              Nothing here matches “{query}”.
            </p>
            <Button variant="glass" size="sm" onClick={() => navigate({ q: "" })}>
              Clear search
            </Button>
          </div>
        ) : (
          <TableWrapper>
            <Table>
              <TableHead>
                <TableRow className="hover:bg-transparent">
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Role</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Last sign-in</TableHeaderCell>
                  <TableHeaderCell className="w-32 text-right">Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => {
                  const isSelf = user.id === currentUserId;
                  const busy = busyId === user.id;

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <span className="block max-w-56">
                          <span className="block truncate text-sm font-semibold text-foam">
                            {user.name}
                            {isSelf ? (
                              <span className="ml-2 font-mono text-[.6rem] text-fog">
                                YOU
                              </span>
                            ) : null}
                          </span>
                          <span className="block truncate text-[.7rem] text-fog">
                            {user.email}
                          </span>
                        </span>
                      </TableCell>

                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[.58rem] font-bold tracking-[.14em] uppercase",
                            user.role === "SUPER_ADMIN"
                              ? "bg-gold text-ink"
                              : "bg-volt/85 text-white"
                          )}
                        >
                          {user.role === "SUPER_ADMIN" ? (
                            <ShieldCheck className="size-3" aria-hidden />
                          ) : null}
                          {ROLE_LABELS[user.role]}
                        </span>
                      </TableCell>

                      <TableCell>
                        <Badge tone={user.isActive ? "online" : "muted"}>
                          {user.isActive ? "Active" : "Disabled"}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <span className="font-mono text-[.66rem] whitespace-nowrap text-fog">
                          {user.lastLoginAt
                            ? dateFormat.format(new Date(user.lastLoginAt))
                            : "never"}
                        </span>
                      </TableCell>

                      <TableCell className="w-32">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(user)}
                            aria-label={`Edit ${user.name}`}
                            className="grid size-8 place-items-center rounded-lg border border-white/10 text-mist transition-colors hover:border-gold/45 hover:text-gold"
                          >
                            <Pencil className="size-3.5" aria-hidden />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setResetting(user);
                              setNewPassword("");
                              setErrors({});
                            }}
                            aria-label={`Reset password for ${user.name}`}
                            className="grid size-8 place-items-center rounded-lg border border-white/10 text-mist transition-colors hover:border-volt/50 hover:text-volt-300"
                          >
                            <KeyRound className="size-3.5" aria-hidden />
                          </button>

                          {/* Disabled for your own row: the server refuses it
                              anyway, and an enabled button that always errors
                              is a worse answer than one that explains itself. */}
                          <button
                            type="button"
                            onClick={() => toggleActive(user)}
                            disabled={isSelf || busy}
                            aria-label={`${user.isActive ? "Disable" : "Enable"} ${user.name}`}
                            title={
                              isSelf ? "You cannot disable your own account" : undefined
                            }
                            className="grid size-8 place-items-center rounded-lg border border-white/10 text-mist transition-colors hover:border-amber-400/50 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-35"
                          >
                            {busy ? (
                              <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
                            ) : user.isActive ? (
                              <UserX className="size-3.5" aria-hidden />
                            ) : (
                              <UserCheck className="size-3.5" aria-hidden />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setPendingDelete(user)}
                            disabled={isSelf}
                            aria-label={`Delete ${user.name}`}
                            title={
                              isSelf ? "You cannot delete your own account" : undefined
                            }
                            className="grid size-8 place-items-center rounded-lg border border-white/10 text-mist transition-colors hover:border-red-500/50 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-35"
                          >
                            <Trash2 className="size-3.5" aria-hidden />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableWrapper>
        )}
      </Card>

      {pageCount > 1 ? (
        <nav
          aria-label="Account pages"
          className="mt-4 flex items-center justify-between gap-3"
        >
          <p className="font-mono text-[.66rem] tracking-wide text-fog uppercase">
            {total} account{total === 1 ? "" : "s"} · page {page} of {pageCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="glass"
              size="sm"
              disabled={page <= 1}
              onClick={() => navigate({ page: page - 1 })}
            >
              <ChevronLeft aria-hidden />
              Previous
            </Button>
            <Button
              variant="glass"
              size="sm"
              disabled={page >= pageCount}
              onClick={() => navigate({ page: page + 1 })}
            >
              Next
              <ChevronRight aria-hidden />
            </Button>
          </div>
        </nav>
      ) : null}

      {/* ------------------------------------------------- create / edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="md">
          <form onSubmit={submit} noValidate className="contents">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit account" : "New account"}</DialogTitle>
              <DialogDescription>
                {editing
                  ? "Role and status take effect on this person's next request."
                  : "They can sign in as soon as you save."}
              </DialogDescription>
            </DialogHeader>

            <DialogBody>
              <div className="grid gap-4">
                {errors.form ? (
                  <p
                    role="alert"
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300"
                  >
                    {errors.form}
                  </p>
                ) : null}

                <Field label="Name" htmlFor="name" error={errors.name} required>
                  <Input
                    id="name"
                    value={draft.name}
                    onChange={(e) => patch({ name: e.target.value })}
                    aria-invalid={Boolean(errors.name)}
                  />
                </Field>

                <Field label="Email" htmlFor="email" error={errors.email} required>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="off"
                    value={draft.email}
                    onChange={(e) => patch({ email: e.target.value })}
                    aria-invalid={Boolean(errors.email)}
                  />
                </Field>

                {!editing ? (
                  <Field
                    label="Password"
                    htmlFor="password"
                    error={errors.password}
                    required
                    hint="At least 12 characters. Share it with them over a channel you trust."
                  >
                    <Input
                      id="password"
                      type="text"
                      autoComplete="new-password"
                      value={draft.password}
                      onChange={(e) => patch({ password: e.target.value })}
                      aria-invalid={Boolean(errors.password)}
                    />
                  </Field>
                ) : null}

                <Field
                  label="Role"
                  htmlFor="role"
                  error={errors.role}
                  hint="Super Admins can change settings, analytics and accounts. Admins manage content."
                >
                  <NativeSelect
                    id="role"
                    value={draft.role}
                    onChange={(e) => patch({ role: e.target.value as AdminRole })}
                  >
                    <option value="ADMIN">Admin — customer service</option>
                    <option value="SUPER_ADMIN">Super Admin — full access</option>
                  </NativeSelect>
                </Field>

                <SwitchRow
                  id="isActive"
                  label="Account is active"
                  hint="A disabled account keeps its history but cannot sign in."
                  checked={draft.isActive}
                  onCheckedChange={(value) => patch({ isActive: value })}
                />
              </div>
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="glass"
                size="sm"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" variant="gold" size="sm" disabled={saving}>
                {saving ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
                {saving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---------------------------------------------- password reset */}
      <Dialog
        open={resetting !== null}
        onOpenChange={(open) => !open && setResetting(null)}
      >
        <DialogContent size="sm">
          <form onSubmit={submitReset} noValidate className="contents">
            <DialogHeader>
              <DialogTitle>Reset password</DialogTitle>
              <DialogDescription>
                Sets a new password for {resetting?.email}. They are not signed out
                of sessions they already have — disable the account if you need
                that.
              </DialogDescription>
            </DialogHeader>

            <DialogBody>
              <Field
                label="New password"
                htmlFor="newPassword"
                error={errors.password}
                required
                hint="At least 12 characters."
              >
                <Input
                  id="newPassword"
                  type="text"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  aria-invalid={Boolean(errors.password)}
                />
              </Field>
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="glass"
                size="sm"
                onClick={() => setResetting(null)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" variant="gold" size="sm" disabled={saving}>
                {saving ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
                Set password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this account?"
        description={
          pendingDelete
            ? `"${pendingDelete.name}" (${pendingDelete.email}) will lose access immediately. Their audit history is kept. This cannot be undone.`
            : ""
        }
        busy={busyId === pendingDelete?.id}
        onConfirm={confirmDelete}
      />
    </>
  );
}
