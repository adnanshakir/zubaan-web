"use client"

import { PageHeader } from "@/components/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TtsPanel from "./tts-panel"
import SttPanel from "./stt-panel"

export default function VoiceLabClient() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Voice lab" description="Compare voices and test speech recognition." />
      <Tabs defaultValue="voices">
        <TabsList className="w-full rounded-full">
          <TabsTrigger value="voices" className="rounded-full">
            Voices
          </TabsTrigger>
          <TabsTrigger value="transcribe" className="rounded-full">
            Transcribe
          </TabsTrigger>
        </TabsList>
        <TabsContent value="voices" className="mt-5">
          <TtsPanel />
        </TabsContent>
        <TabsContent value="transcribe" className="mt-5">
          <SttPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
