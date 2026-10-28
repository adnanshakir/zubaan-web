import LessonPlayClient from "./play-client"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <LessonPlayClient id={id} />
}
