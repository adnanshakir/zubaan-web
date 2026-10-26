"use client"

import { useState } from "react"
import { PageHeader } from "@/components/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TtsPanel from "./tts-panel"
import SttPanel from "./stt-panel"

export default function VoiceLabClient() {
  const [tab, setTab] = useState("voices")

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Voice lab" description="Compare voices and test speech recognition." />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full rounded-full">
          <TabsTrigger value="voices" className="rounded-full">
            Voices
          </TabsTrigger>
          <TabsTrigger value="transcribe" className="rounded-full">
            Transcribe
          </TabsTrigger>
        </TabsList>
        <TabsContent value="voices" forceMount className="mt-5">
          <TtsPanel isVisible={tab === "voices"} />
        </TabsContent>
        <TabsContent value="transcribe" forceMount className="mt-5">
          <SttPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
