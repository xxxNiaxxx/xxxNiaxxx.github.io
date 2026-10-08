import { z } from "zod";
import { id, optionalQuery, optionalText, requiredText } from "./common";

export const taskType = z.enum(["CLEANING", "MAINTENANCE", "CHECK_IN", "CHECK_OUT", "INSPECTION", "OTHER"]);
export const taskStatus = z.enum(["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);
export const taskPriority = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const checklistSchema = z
  .array(z.object({ label: z.string().trim().min(1).max(200), done: z.boolean().default(false) }))
  .max(50);

const dueAt = z.preprocess(
  (v) => (v === "" ? null : v),
  z.coerce.date({ error: "Δώστε έγκυρη προθεσμία" }).nullish(),
);

export const taskCreateSchema = z.object({
  propertyId: id,
  reservationId: id.nullish(),
  title: requiredText("Τίτλος", 200),
  description: optionalText(4000),
  type: taskType.default("OTHER"),
  priority: taskPriority.default("MEDIUM"),
  status: taskStatus.default("TODO"),
  dueAt,
  assignedToUserId: id.nullish(),
  checklist: checklistSchema.optional(),
});

export const taskUpdateSchema = taskCreateSchema.partial();

export const taskTab = z.enum(["today", "upcoming", "overdue", "completed", "all"]);

export const taskListQuery = z.object({
  tab: optionalQuery(taskTab),
  propertyId: optionalQuery(id),
  reservationId: optionalQuery(id),
  type: optionalQuery(taskType),
  status: optionalQuery(taskStatus),
  assignee: optionalQuery(z.union([z.literal("me"), z.literal("unassigned"), id])),
});

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
export type TaskListQuery = z.infer<typeof taskListQuery>;
export type ChecklistItem = z.infer<typeof checklistSchema>[number];
