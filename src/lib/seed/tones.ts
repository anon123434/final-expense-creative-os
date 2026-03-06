export interface ToneSeed {
  key: string;
  label: string;
  description: string;
  energy: "low" | "medium" | "high";
  bestPersonas: string[];
  voiceDirection: string;
  promptHint: string;
}

export const tones: ToneSeed[] = [
  {
    key: "urgent",
    label: "Urgent",
    description: "High-energy, time-sensitive. Pushes the viewer to act immediately.",
    energy: "high",
    bestPersonas: ["son_who_works_with_state", "direct_testimonial_narrator"],
    voiceDirection: "Fast pacing, emphatic stress on deadlines, rising intonation",
    promptHint: "Use short sentences. Emphasize 'now', 'today', 'before it's too late'. Create time pressure.",
  },
  {
    key: "heartfelt",
    label: "Heartfelt",
    description: "Warm, emotional, family-centered. Tugs at the heart without being manipulative.",
    energy: "low",
    bestPersonas: ["widow", "grandson", "daughter"],
    voiceDirection: "Slow, warm, slight tremor on emotional lines. Natural pauses.",
    promptHint: "Focus on love, family bonds, and the desire to protect. Let silence do the heavy lifting.",
  },
  {
    key: "insider",
    label: "Insider",
    description: "Conspiratorial, 'I know something you don't.' Creates information asymmetry.",
    energy: "medium",
    bestPersonas: ["son_who_works_with_state", "funeral_director"],
    voiceDirection: "Leaning in, slightly hushed, as if sharing a secret. Confident.",
    promptHint: "Use 'most people don't know', 'they won't tell you this', 'I'm going to share something'. Build exclusivity.",
  },
  {
    key: "practical",
    label: "Practical",
    description: "No-nonsense, logical, focused on facts and value. Appeals to rational decision-makers.",
    energy: "medium",
    bestPersonas: ["funeral_director", "family_friend", "direct_testimonial_narrator"],
    voiceDirection: "Even-toned, clear, deliberate. No drama — just the facts.",
    promptHint: "Lead with numbers: cost of funerals, premium amounts, coverage value. Let logic make the case.",
  },
  {
    key: "authority",
    label: "Authority",
    description: "Professional, credible, institutional. Builds trust through expertise.",
    energy: "medium",
    bestPersonas: ["pastor", "funeral_director", "son_who_works_with_state"],
    voiceDirection: "Measured, confident, slightly formal. Speaks with weight.",
    promptHint: "Reference credentials, experience, or institutional knowledge. 'In my 20 years as a funeral director...'",
  },
  {
    key: "grief_to_relief",
    label: "Grief to Relief",
    description: "Starts in sorrow, transitions to hope. An emotional journey in 30–60 seconds.",
    energy: "low",
    bestPersonas: ["widow", "daughter", "funeral_attendee"],
    voiceDirection: "Start quiet and heavy. Gradually lift. End with warmth and resolve.",
    promptHint: "Structure as a two-act story: darkness first, then light. The turning point is discovering the coverage.",
  },
  {
    key: "loving",
    label: "Loving",
    description: "Gentle, nurturing, focused on the love that motivates the decision.",
    energy: "low",
    bestPersonas: ["widow", "grandson", "pastor"],
    voiceDirection: "Soft, maternal/paternal, like a bedtime story. Gentle and reassuring.",
    promptHint: "Frame everything through the lens of love. 'I did this because I love them.' Make the policy an act of love.",
  },
  {
    key: "proud",
    label: "Proud",
    description: "Empowered, self-assured. The speaker took control and feels good about it.",
    energy: "medium",
    bestPersonas: ["direct_testimonial_narrator", "grandson", "family_friend"],
    voiceDirection: "Head held high. Slight smile in the voice. Confident, not boastful.",
    promptHint: "Use 'I took care of it', 'I'm proud I did this', 'My family won't have to worry'. Ownership language.",
  },
  {
    key: "solemn",
    label: "Solemn",
    description: "Serious, reverent, weight-of-the-moment. Appropriate for funeral or memorial contexts.",
    energy: "low",
    bestPersonas: ["pastor", "funeral_attendee", "funeral_director"],
    voiceDirection: "Slow, deliberate, respectful. Minimal inflection. Let the gravity speak.",
    promptHint: "Set a respectful tone. Reference the finality of death without being morbid. Dignified and measured.",
  },
  {
    key: "testimonial",
    label: "Testimonial",
    description: "Authentic, unscripted-feeling. Real person sharing a real experience.",
    energy: "medium",
    bestPersonas: ["direct_testimonial_narrator", "neighbor", "family_friend"],
    voiceDirection: "Natural, conversational, occasional stumbles or pauses for authenticity.",
    promptHint: "Write as if transcribing someone talking. Include filler words sparingly. 'And, you know, I just... I'm glad I called.'",
  },
];

export function getToneByKey(key: string): ToneSeed | undefined {
  return tones.find((t) => t.key === key);
}

export function getTonesByEnergy(energy: ToneSeed["energy"]): ToneSeed[] {
  return tones.filter((t) => t.energy === energy);
}

export function getTonesByPersona(personaKey: string): ToneSeed[] {
  return tones.filter((t) => t.bestPersonas.includes(personaKey));
}
