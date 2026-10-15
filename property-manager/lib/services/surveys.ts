import { db } from "@/lib/db";

/** Whether the user has already answered the survey with this id. */
export async function surveyAnswered(userId: string, surveyId: string) {
  return (await db.feedback.count({ where: { userId, page: surveyId } })) > 0;
}
