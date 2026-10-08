import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import type { OrgContext } from "@/lib/permissions";
import { registerAccount } from "@/lib/services/accounts";
import {
  acceptInvitationForUser,
  createInvitation,
  getInvitationByToken,
  listInvitations,
  revokeInvitation,
} from "@/lib/services/invitations";
import { listMembers, removeMember, updateMemberRole } from "@/lib/services/members";
import { createTask } from "@/lib/services/tasks";
import { createProperty, createTenant, resetDatabase } from "./helpers";

let n = 0;
const newEmail = () => `invitee${Date.now()}${n++}@test.local`;
const newUser = (email = newEmail()) => db.user.create({ data: { email, name: "Invitee", passwordHash: "x" } });

async function join(owner: OrgContext, role: "ADMIN" | "MEMBER"): Promise<OrgContext> {
  const user = await newUser();
  const { token } = await createInvitation(owner, { email: user.email, role });
  await acceptInvitationForUser(user, token);
  return { userId: user.id, organizationId: owner.organizationId, role };
}

describe("team invitations", () => {
  let owner: OrgContext;
  let other: OrgContext;

  beforeAll(async () => {
    await resetDatabase();
  });
  beforeEach(async () => {
    owner = await createTenant("Team");
    other = await createTenant("Other");
  });

  it("invites by email and the invitee joins with the given role", async () => {
    const user = await newUser();
    const { token, path, invitation } = await createInvitation(owner, { email: user.email.toUpperCase(), role: "MEMBER" });
    expect(path).toBe(`/invite/${token}`);
    expect(invitation.email).toBe(user.email);
    expect((await listInvitations(owner)).map((i) => i.id)).toEqual([invitation.id]);
    expect(await getInvitationByToken(token)).toMatchObject({ organizationName: "Team", status: "VALID", role: "MEMBER" });

    await acceptInvitationForUser(user, token);
    const members = await listMembers(owner);
    expect(members.find((m) => m.userId === user.id)?.role).toBe("MEMBER");
    expect(await listInvitations(owner)).toHaveLength(0);
    expect((await getInvitationByToken(token))?.status).toBe("ACCEPTED");
    await expect(acceptInvitationForUser(user, token)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("only works for the invited email", async () => {
    const { token } = await createInvitation(owner, { email: newEmail() });
    const stranger = await newUser();
    await expect(acceptInvitationForUser(stranger, token)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect((await listMembers(owner)).some((m) => m.userId === stranger.id)).toBe(false);
  });

  it("rejects expired, revoked and replaced links", async () => {
    const user = await newUser();
    const past = new Date(Date.now() - 8 * 86_400_000);
    const expired = await createInvitation(owner, { email: user.email }, past);
    await expect(acceptInvitationForUser(user, expired.token)).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const first = await createInvitation(owner, { email: user.email });
    const second = await createInvitation(owner, { email: user.email });
    await expect(acceptInvitationForUser(user, first.token)).rejects.toMatchObject({ code: "BAD_REQUEST" });

    await revokeInvitation(owner, second.invitation.id);
    await expect(acceptInvitationForUser(user, second.token)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(await getInvitationByToken("not-a-token")).toBeNull();
  });

  it("enforces who can invite whom", async () => {
    const admin = await join(owner, "ADMIN");
    const member = await join(owner, "MEMBER");
    await expect(createInvitation(member, { email: newEmail() })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await listInvitations(member)).toEqual([]);
    await expect(createInvitation(admin, { email: newEmail(), role: "ADMIN" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await createInvitation(admin, { email: newEmail(), role: "MEMBER" });
    await expect(createInvitation(owner, { email: newEmail(), role: "OWNER" })).rejects.toMatchObject({ name: "ZodError" });

    const memberEmail = (await db.user.findUniqueOrThrow({ where: { id: member.userId } })).email;
    await expect(createInvitation(owner, { email: memberEmail })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("keeps organizations isolated", async () => {
    const { invitation } = await createInvitation(owner, { email: newEmail() });
    await expect(revokeInvitation(other, invitation.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await listInvitations(other)).toEqual([]);
  });

  it("registering through an invitation joins the team instead of creating an organization", async () => {
    const email = newEmail();
    const { token } = await createInvitation(owner, { email });
    const before = await db.organization.count();
    const { organizationId } = await registerAccount({ name: "Maria", email, password: "password123", invite: token });
    expect(organizationId).toBe(owner.organizationId);
    expect(await db.organization.count()).toBe(before);

    await expect(registerAccount({ name: "X", email: newEmail(), password: "password123" })).rejects.toMatchObject({ name: "ZodError" });
    // A wrong email rolls the whole registration back.
    const second = await createInvitation(owner, { email: newEmail() });
    const wrong = newEmail();
    await expect(registerAccount({ name: "Y", email: wrong, password: "password123", invite: second.token })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await db.user.findUnique({ where: { email: wrong } })).toBeNull();
  });
});

describe("team members", () => {
  let owner: OrgContext;

  beforeEach(async () => {
    owner = await createTenant("Crew");
  });

  it("only the owner changes roles", async () => {
    const admin = await join(owner, "ADMIN");
    const member = await join(owner, "MEMBER");
    await expect(updateMemberRole(admin, member.userId, { role: "ADMIN" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await updateMemberRole(owner, member.userId, { role: "ADMIN" });
    expect((await listMembers(owner)).find((m) => m.userId === member.userId)?.role).toBe("ADMIN");
    await expect(updateMemberRole(owner, owner.userId, { role: "MEMBER" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("removes members, unassigns their open tasks, and protects the owner", async () => {
    const admin = await join(owner, "ADMIN");
    const member = await join(owner, "MEMBER");
    const property = await createProperty(owner);
    const task = await createTask(owner, { propertyId: property.id, title: "Clean", assignedToUserId: member.userId });

    await expect(removeMember(member, admin.userId)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(removeMember(admin, owner.userId)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(removeMember(owner, owner.userId)).rejects.toMatchObject({ code: "FORBIDDEN" });

    await removeMember(admin, member.userId);
    expect((await listMembers(owner)).some((m) => m.userId === member.userId)).toBe(false);
    expect((await db.task.findUniqueOrThrow({ where: { id: task.id } })).assignedToUserId).toBeNull();

    // Anyone but the owner can leave.
    await removeMember(admin, admin.userId);
    expect((await listMembers(owner)).map((m) => m.role)).toEqual(["OWNER"]);
  });
});
