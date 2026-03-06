export interface TriggerSeed {
  key: string;
  label: string;
  description: string;
  category: "emotional" | "logical" | "social" | "urgency";
  promptHint: string;
}

export const triggers: TriggerSeed[] = [
  {
    key: "authority",
    label: "Authority",
    description: "Leverages trust in experts, officials, or institutions to build credibility.",
    category: "social",
    promptHint: "Reference a trusted authority figure, government program, or licensed professional endorsing the product.",
  },
  {
    key: "scarcity",
    label: "Scarcity",
    description: "Creates urgency through limited availability or expiring offers.",
    category: "urgency",
    promptHint: "Emphasize limited spots, expiring rates, or one-time-only offers that the viewer might miss.",
  },
  {
    key: "social_proof",
    label: "Social Proof",
    description: "Shows that others — peers, neighbors, community — have already taken action.",
    category: "social",
    promptHint: "Include testimonials, statistics about how many people have enrolled, or community endorsements.",
  },
  {
    key: "loss_aversion",
    label: "Loss Aversion",
    description: "Highlights what the viewer stands to lose by not acting — financial burden, family hardship.",
    category: "emotional",
    promptHint: "Paint a vivid picture of the negative outcome if no action is taken — unpaid bills, burdened family.",
  },
  {
    key: "guilt_avoidance",
    label: "Guilt Avoidance",
    description: "Appeals to the desire to not leave loved ones with debt or hardship.",
    category: "emotional",
    promptHint: "Frame inaction as leaving a burden on children or spouse. Make the viewer feel responsible for preventing it.",
  },
  {
    key: "conspiracy_insider",
    label: "Conspiracy / Insider",
    description: "Positions the message as hidden knowledge that 'they' don't want you to know.",
    category: "logical",
    promptHint: "Use language like 'what the insurance companies won't tell you' or 'the secret program most people don't know about'.",
  },
  {
    key: "simplicity",
    label: "Simplicity",
    description: "Emphasizes how easy the process is — no exams, no paperwork, just one call.",
    category: "logical",
    promptHint: "Stress the ease: no medical exam, no complicated forms, approval in minutes, just one phone call.",
  },
  {
    key: "affordability",
    label: "Affordability",
    description: "Anchors the cost to something trivially small — 'less than a dollar a day'.",
    category: "logical",
    promptHint: "Compare the daily cost to something cheap — a cup of coffee, spare change. Make it feel insignificant.",
  },
  {
    key: "value_disparity",
    label: "Value Disparity",
    description: "Contrasts the small cost against the massive benefit — pennies for thousands in coverage.",
    category: "logical",
    promptHint: "Juxtapose the tiny monthly premium against the large payout ($10K–$35K). Make the value feel enormous.",
  },
  {
    key: "legitimacy",
    label: "Legitimacy",
    description: "Reinforces that this is a real, licensed, state-regulated program — not a scam.",
    category: "social",
    promptHint: "Mention state regulation, licensed agents, A-rated carriers, or official program names to build trust.",
  },
  {
    key: "urgency",
    label: "Urgency",
    description: "Pushes the viewer to act now — deadlines, age cutoffs, rate locks.",
    category: "urgency",
    promptHint: "Include time-limited language: 'call before midnight', 'rates go up on your next birthday', 'don't wait'.",
  },
  {
    key: "autonomy",
    label: "Autonomy",
    description: "Empowers the viewer — this is their choice, their decision, their control over their legacy.",
    category: "emotional",
    promptHint: "Frame the decision as empowering: 'You decide', 'Take control of your legacy', 'It's your choice to protect them'.",
  },
];

export function getTriggerByKey(key: string): TriggerSeed | undefined {
  return triggers.find((t) => t.key === key);
}

export function getTriggersByCategory(category: TriggerSeed["category"]): TriggerSeed[] {
  return triggers.filter((t) => t.category === category);
}
