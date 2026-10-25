import SummaryClient from "./summary-client"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SummaryClient id={id} />
}
