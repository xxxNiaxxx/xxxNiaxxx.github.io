import type { Benefit, Deadline, Task } from '@/types/models';
import { daysUntil } from './dates';

/** Upcoming deadlines from pending tasks and from the benefits that may concern the user. */
export function buildDeadlines(tasks: Task[], benefits: Benefit[]): Deadline[] {
  const taskDeadlines: Deadline[] = tasks
    .filter((t) => t.status === 'pending' && t.dueDate)
    .map((t) => ({ id: `task:${t.id}`, title: t.title, date: t.dueDate!, kind: 'task', taskId: t.id, benefitId: t.benefitId }));

  // Skip a benefit deadline when the user already has a task for that benefit.
  const coveredBenefits = new Set(taskDeadlines.map((d) => d.benefitId).filter(Boolean));
  const benefitDeadlines: Deadline[] = benefits
    .filter((b) => b.deadline && !coveredBenefits.has(b.id))
    .map((b) => ({ id: `benefit:${b.id}`, title: b.title, date: b.deadline!, kind: 'benefit', benefitId: b.id }));

  return [...taskDeadlines, ...benefitDeadlines]
    .filter((d) => daysUntil(d.date) >= -7)
    .sort((a, b) => a.date.localeCompare(b.date));
}
