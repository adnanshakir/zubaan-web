"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeftIcon } from "lucide-react"
import { TextMorph } from "torph/react"
import { toast } from "sonner"
import { OptionList } from "@/components/option-list"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { describeError, api } from "@/lib/api/client"
import type { Goal, Language, Level } from "@/lib/api/types"
import { GOALS, LANGUAGES, LEVELS } from "@/lib/onboarding-options"

const STEP_COUNT = 4

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [language, setLanguage] = useState<Language | null>(null)
  const [goal, setGoal] = useState<Goal | null>(null)
  const [level, setLevel] = useState<Level | null>(null)
  const [name, setName] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const isLast = step === STEP_COUNT - 1
  const canContinue =
    step === 0 ? language !== null : step === 1 ? goal !== null : step === 2 ? level !== null : true

  async function next() {
    if (!isLast) {
      setStep((current) => current + 1)
      return
    }
    if (!language || !goal || !level) return

    setSubmitting(true)
    try {
      await api.onboard({ nativeLanguage: language, goal, level, name: name.trim() || undefined })
      router.replace("/home")
    } catch (error) {
      toast.error(describeError(error))
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <form
        className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-8"
        onSubmit={(event) => {
          event.preventDefault()
          void next()
        }}
      >
        <div className="flex gap-1.5" aria-label={`Step ${step + 1} of ${STEP_COUNT}`}>
          {Array.from({ length: STEP_COUNT }, (_, index) => (
            <span
              key={index}
              className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                index <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div
          key={step}
          className="mt-8 flex animate-in flex-col gap-6 duration-200 fade-in-0 slide-in-from-bottom-1"
        >
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {step === 0
                ? "What's your first language?"
                : step === 1
                  ? "What do you want English for?"
                  : step === 2
                    ? "How would you describe your English?"
                    : "What should we call you?"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {step === 0
                ? "We'll use it for hints while you learn."
                : step === 1
                  ? "Pick the one that matters most."
                  : step === 2
                    ? "Be honest, it helps us pick the right lessons."
                    : "Optional."}
            </p>
          </div>

          {step === 0 ? (
            <OptionList
              label="First language"
              options={LANGUAGES}
              value={language}
              onChange={setLanguage}
              columns={2}
            />
          ) : null}
          {step === 1 ? (
            <OptionList label="English goal" options={GOALS} value={goal} onChange={setGoal} />
          ) : null}
          {step === 2 ? (
            <OptionList label="English level" options={LEVELS} value={level} onChange={setLevel} />
          ) : null}
          {step === 3 ? (
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={50}
              placeholder="Your name"
              aria-label="Your name"
              className="h-10 rounded-xl"
            />
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between pt-8">
          <Button
            type="button"
            variant="ghost"
            className={step === 0 ? "invisible" : undefined}
            onClick={() => setStep((current) => current - 1)}
          >
            <ChevronLeftIcon />
            Back
          </Button>
          <Button type="submit" loading={submitting} disabled={!canContinue || submitting}>
            <TextMorph>{isLast ? "Start learning" : "Continue"}</TextMorph>
          </Button>
        </div>
      </form>
    </div>
  )
}
