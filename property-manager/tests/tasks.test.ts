import { beforeAll, describe, expect, it } from "vitest";
import type { OrgContext } from "@/lib/permissions";
import { createTask, deleteTask, listTasks, updateTask } from "@/lib/services/tasks";
import { createGuest, createProperty, createReservationRow, createTenant, resetDatabase } from "./helpers";

describe("tasks", () => {
  let a: OrgContext;
  let b: OrgContext;
  let aProperty: string;

  beforeAll(async () => {
    await resetDatabase();
    a = await createTenant("A");
    b = await createTenant("B");
    aProperty = (await createProperty(a)).id;
  });

  it("completing a task sets completedAt and reopening clears it", async () => {
    const task = await createTask(a, { propertyId: aProperty, title: "Clean", type: "CLEANING" });
    expect(task.checklist.length).toBeGreaterThan(0);
    const started = await updateTask(a, task.id, { status: "IN_PROGRESS" });
    expect(started.completedAt).toBeNull();
    const done = await updateTask(a, task.id, { status: "COMPLETED" });
    expect(done.status).toBe("COMPLETED");
    expect(done.completedAt).not.toBeNull();
    const reopened = await updateTask(a, task.id, { status: "TODO" });
    expect(reopened.completedAt).toBeNull();
  });

  it("another organization cannot read, change or delete the task", async () => {
    const task = await createTask(a, { propertyId: aProperty, title: "Fix tap", type: "MAINTENANCE" });
    await expect(updateTask(b, task.id, { status: "COMPLETED" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(deleteTask(b, task.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await listTasks(b)).toHaveLength(0);
  });

  it("cannot attach a task to a foreign property, reservation or assignee", async () => {
    const bProperty = await createProperty(b);
    await expect(createTask(a, { propertyId: bProperty.id, title: "x" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(createTask(a, { propertyId: aProperty, title: "x", assignedToUserId: b.userId })).rejects.toMatchObject({ code: "NOT_FOUND" });
    const bRes = await createReservationRow(b, { propertyId: bProperty.id, guestId: (await createGuest(b)).id, checkIn: "2026-01-01", checkOut: "2026-01-02" });
    await expect(createTask(a, { propertyId: aProperty, title: "x", reservationId: bRes.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("members cannot delete tasks, admins can", async () => {
    const task = await createTask(a, { propertyId: aProperty, title: "Temp" });
    await expect(deleteTask({ ...a, role: "MEMBER" }, task.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await deleteTask(a, task.id);
  });

  it("assigns tasks to members of the organization", async () => {
    const task = await createTask(a, { propertyId: aProperty, title: "Assign me" });
    const assigned = await updateTask(a, task.id, { assignedToUserId: a.userId });
    expect(assigned.assignedToUserId).toBe(a.userId);
    const mine = await listTasks(a, { assignee: "me" });
    expect(mine.map((t) => t.id)).toContain(task.id);
  });

  it("a partial update keeps type, priority and status", async () => {
    const task = await createTask(a, { propertyId: aProperty, title: "Deep clean", type: "CLEANING", priority: "HIGH" });
    await updateTask(a, task.id, { status: "IN_PROGRESS" });
    const ticked = await updateTask(a, task.id, { checklist: task.checklist.map((c, i) => ({ ...c, done: i === 0 })) });
    expect(ticked).toMatchObject({ type: "CLEANING", priority: "HIGH", status: "IN_PROGRESS" });
  });

  it("an empty assignee from the form means unassigned", async () => {
    const task = await createTask(a, { propertyId: aProperty, title: "Pool", assignedToUserId: "", reservationId: "" });
    expect(task.assignedToUserId).toBeNull();
  });
});
