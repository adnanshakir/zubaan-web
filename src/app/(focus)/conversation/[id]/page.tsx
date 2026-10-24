import ConversationClient from "./conversation-client"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ConversationClient id={id} />
}
