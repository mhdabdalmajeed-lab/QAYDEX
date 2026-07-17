import type { Metadata } from "next";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { RiCheckLine, RiErrorWarningLine, RiLock2Line, RiSubtractLine } from "@remixicon/react";

import { PageHeader } from "@/components/layout/page-header";
import {
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  ROLE_LABELS,
  ROLE_ORDER,
} from "@/components/settings/options";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { firstParam } from "@/lib/audit-filters";
import { AccessDenied, requireMember, roleHas } from "@/lib/auth/guards";
import { displayName, listMembers } from "@/lib/workspace-directory";
import { changeMemberRole, removeMember } from "@/server/actions/settings";

/**
 * Members and roles (PRD §21.1).
 *
 * The ten roles are not descriptions written for this page — the matrix below is generated
 * by asking `roleHas()` the same question the server asks before it allows anything. If a
 * permission moves between roles in `@/lib/auth/guards`, this table moves with it. A role
 * matrix that can drift from the enforcement it documents is worse than no matrix: it is a
 * confident, wrong answer to "who can approve an audit?"
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Members and roles" };

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const SAVED_MESSAGES: Record<string, string> = {
  role: "The role was changed. It applies to their next request — nothing already done is revisited.",
  removed:
    "The member was removed. Their entries stay in the audit trail, which records the email address as it was at the time.",
};

function Allowed({ allowed }: { allowed: boolean }) {
  // Never colour alone: an icon and text carry the meaning, colour only reinforces it.
  return allowed ? (
    <>
      <RiCheckLine aria-hidden="true" className="mx-auto size-4 text-foreground" />
      <span className="sr-only">Allowed</span>
    </>
  ) : (
    <>
      <RiSubtractLine aria-hidden="true" className="mx-auto size-4 text-muted-foreground/50" />
      <span className="sr-only">Not allowed</span>
    </>
  );
}

export default async function MembersSettingsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;

  const [workspace] = await db
    .select({ id: workspaces.id, name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  if (!workspace) notFound();

  let canManage = false;
  let viewerId = "";
  try {
    const { membership, user } = await requireMember(workspace.id);
    canManage = roleHas(membership.role, "members.manage");
    viewerId = user.id;
  } catch (error) {
    if (error instanceof AccessDenied) notFound();
    throw error;
  }

  const members = await listMembers(workspace.id);
  const owners = members.filter((member) => member.role === "owner");

  const saved = firstParam(query.saved);
  const error = firstParam(query.error);

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Settings", href: `/w/${slug}/settings` },
          { label: "Members and roles" },
        ]}
        title="Members and roles"
        description={
          <>
            {members.length} member{members.length === 1 ? "" : "s"} of {workspace.name}. A role
            is enforced on the server on every request — including on direct API calls — not
            only by what this interface offers.
          </>
        }
      />

      <main className="flex flex-1 flex-col gap-6 px-4 py-5 md:px-6">
        {saved && SAVED_MESSAGES[saved] ? (
          <Alert>
            <RiCheckLine aria-hidden="true" />
            <AlertTitle>Saved</AlertTitle>
            <AlertDescription>{SAVED_MESSAGES[saved]}</AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <RiErrorWarningLine aria-hidden="true" />
            <AlertTitle>Nothing was changed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {!canManage ? (
          <Alert>
            <RiLock2Line aria-hidden="true" />
            <AlertTitle>You can see who is here, but not change it</AlertTitle>
            <AlertDescription>
              Changing roles or removing members needs the <code>members.manage</code>{" "}
              permission, which your role does not have.
            </AlertDescription>
          </Alert>
        ) : null}

        <section aria-labelledby="members-heading" className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="members-heading" className="font-heading text-sm font-semibold">
              Members
            </h2>
            <p className="text-sm text-muted-foreground">
              {owners.length === 1
                ? "One owner. A workspace must always keep at least one — the last owner cannot be demoted or removed."
                : `${owners.length} owners.`}
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-56">Member</TableHead>
                  <TableHead className="w-32">Joined</TableHead>
                  <TableHead className="min-w-56">Role</TableHead>
                  <TableHead className="w-28 text-right">Access</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const isSelf = member.userId === viewerId;
                  const isLastOwner = member.role === "owner" && owners.length === 1;
                  return (
                    <TableRow key={member.memberId}>
                      <TableCell className="align-top">
                        <span className="block text-sm font-medium">
                          {displayName(member.email)}
                          {isSelf ? (
                            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                              (you)
                            </span>
                          ) : null}
                        </span>
                        <span className="block text-xs text-muted-foreground">{member.email}</span>
                        {member.title ? (
                          <span className="block text-xs text-muted-foreground">{member.title}</span>
                        ) : null}
                      </TableCell>

                      <TableCell className="align-top text-xs tabular-nums text-muted-foreground">
                        <time dateTime={member.createdAt.toISOString()}>
                          {member.createdAt.toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </time>
                      </TableCell>

                      <TableCell className="align-top">
                        {canManage && !isLastOwner ? (
                          <form
                            action={changeMemberRole}
                            className="flex flex-wrap items-center gap-2"
                          >
                            <input type="hidden" name="workspaceSlug" value={slug} />
                            <input type="hidden" name="memberId" value={member.memberId} />
                            <Label htmlFor={`role-${member.memberId}`} className="sr-only">
                              Role for {member.email}
                            </Label>
                            <NativeSelect
                              id={`role-${member.memberId}`}
                              name="role"
                              size="sm"
                              className="w-44"
                              defaultValue={member.role}
                            >
                              {ROLE_ORDER.map((role) => (
                                <NativeSelectOption key={role} value={role}>
                                  {ROLE_LABELS[role]}
                                </NativeSelectOption>
                              ))}
                            </NativeSelect>
                            <Button type="submit" variant="outline" size="sm" className="h-7">
                              Change
                            </Button>
                          </form>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <Badge variant="secondary">{ROLE_LABELS[member.role]}</Badge>
                            {isLastOwner ? (
                              <span className="text-xs text-muted-foreground">
                                The last owner — the role is fixed until another owner exists.
                              </span>
                            ) : null}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="align-top text-right">
                        {canManage && !isSelf && !isLastOwner ? (
                          <form action={removeMember}>
                            <input type="hidden" name="workspaceSlug" value={slug} />
                            <input type="hidden" name="memberId" value={member.memberId} />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              Remove
                            </Button>
                          </form>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {isSelf ? "Ask another admin" : "—"}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </section>

        <section aria-labelledby="matrix-heading" className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="matrix-heading" className="font-heading text-sm font-semibold">
              What each role can do
            </h2>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Read from the same permission map the server checks before it allows an action,
              so this is what will actually happen — not a description of it. Owner and
              administrator hold every permission by definition.
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-72">Permission</TableHead>
                  {ROLE_ORDER.map((role) => (
                    <TableHead key={role} scope="col" className="w-20 text-center align-bottom">
                      <span className="block text-[11px] leading-tight font-medium">
                        {ROLE_LABELS[role]}
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {PERMISSION_GROUPS.map((group) => (
                  <Fragment key={group.title}>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableCell
                        colSpan={ROLE_ORDER.length + 1}
                        className="py-1.5 text-xs font-semibold"
                      >
                        {group.title}
                      </TableCell>
                    </TableRow>
                    {group.permissions.map((permission) => (
                      <TableRow key={permission}>
                        <TableCell className="align-top">
                          <span className="block text-sm">{PERMISSION_LABELS[permission]}</span>
                          <code className="block font-mono text-[11px] text-muted-foreground">
                            {permission}
                          </code>
                        </TableCell>
                        {ROLE_ORDER.map((role) => (
                          <TableCell key={role} className="text-center align-middle">
                            <Allowed allowed={roleHas(role, permission)} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>

          <p className="max-w-3xl text-xs text-muted-foreground">
            A client user is narrowed further than this table can show: beyond these
            permissions, they only ever reach audits belonging to their own client.
          </p>
        </section>
      </main>
    </>
  );
}
