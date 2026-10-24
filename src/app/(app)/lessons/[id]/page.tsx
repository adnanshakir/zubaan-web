import LessonDetailClient from "./lesson-detail-client"

export const instant = false

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <LessonDetailClient id={id} />
}
