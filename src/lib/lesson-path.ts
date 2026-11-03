import type { LessonListItem, Level } from "@/lib/api/types"

export const LEVEL_LABELS: Record<Level, string> = {
  beginner: "Starter",
  elementary: "Everyday",
  intermediate: "Confident",
  advanced: "Fluent",
}

const LEVELS: Level[] = ["beginner", "elementary", "intermediate", "advanced"]

export function groupByLevel(
  lessons: LessonListItem[],
): Array<{ level: Level; label: string; lessons: LessonListItem[] }> {
  return LEVELS.flatMap((level) => {
    const grouped = lessons.filter((lesson) => lesson.level === level)
    return grouped.length ? [{ level, label: LEVEL_LABELS[level], lessons: grouped }] : []
  })
}
