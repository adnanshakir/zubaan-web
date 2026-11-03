export interface PlacementFlowItem {
  id: string
}

export interface PlacementFlowTier<T extends PlacementFlowItem = PlacementFlowItem> {
  tier: number
  items: T[]
}

export interface PlacementFlowAnswer {
  itemId: string
  passed: boolean
}

export type PlacementStep<T extends PlacementFlowItem = PlacementFlowItem> =
  { done: true } | { done: false; tier: number; item: T }

export function nextPlacementStep<T extends PlacementFlowItem>(
  tiers: PlacementFlowTier<T>[],
  answers: PlacementFlowAnswer[],
): PlacementStep<T> {
  for (const tier of tiers) {
    const answered = new Map(answers.map((answer) => [answer.itemId, answer]))
    let passes = 0
    let fails = 0
    for (const item of tier.items) {
      const answer = answered.get(item.id)
      if (!answer) continue
      if (answer.passed) passes += 1
      else fails += 1
    }

    if (passes >= 2) continue
    if (fails >= 2) return { done: true }
    const item = tier.items.find((candidate) => !answered.has(candidate.id))
    if (item) return { done: false, tier: tier.tier, item }
  }
  return { done: true }
}

export function tierProgress(
  tiers: PlacementFlowTier[],
  answers: PlacementFlowAnswer[],
): Array<{ tier: number; state: "done" | "current" | "todo" }> {
  const step = nextPlacementStep(tiers, answers)
  return tiers.map((tier) => ({
    tier: tier.tier,
    state:
      step.done || (step.tier !== undefined && tier.tier < step.tier)
        ? "done"
        : step.tier === tier.tier
          ? "current"
          : "todo",
  }))
}
