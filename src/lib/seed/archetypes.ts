export interface ArchetypeSeed {
  key: string;
  label: string;
  description: string;
  narrativeArc: string;
  bestPersonas: string[];
  bestTriggers: string[];
  promptHint: string;
}

export const archetypes: ArchetypeSeed[] = [
  {
    key: "promise_kept",
    label: "Promise Kept",
    description: "A loved one made a promise to never be a burden — and kept it through one simple step.",
    narrativeArc: "Promise → Fear of breaking it → Discovery of solution → Peace of mind",
    bestPersonas: ["widow", "grandson", "daughter"],
    bestTriggers: ["guilt_avoidance", "simplicity", "autonomy"],
    promptHint: "Build around a promise made years ago. Show the moment they almost broke it, then the relief of keeping it.",
  },
  {
    key: "state_insider_warning",
    label: "State Insider Warning",
    description: "Someone with inside knowledge warns that most people are missing out on a program they qualify for.",
    narrativeArc: "Authority reveal → Hidden information → Urgency to act → Call to action",
    bestPersonas: ["son_who_works_with_state"],
    bestTriggers: ["authority", "conspiracy_insider", "urgency"],
    promptHint: "Lead with 'I work with the state and most people don't know...' Create an insider-knowledge dynamic.",
  },
  {
    key: "funeral_burden_avoided",
    label: "Funeral Burden Avoided",
    description: "A family was spared the $8,000+ funeral cost because someone planned ahead.",
    narrativeArc: "Funeral reality → Cost shock → Someone had a plan → Family protected",
    bestPersonas: ["daughter", "funeral_director", "funeral_attendee"],
    bestTriggers: ["loss_aversion", "affordability", "value_disparity"],
    promptHint: "Start with the funeral cost reality. Contrast the family that planned vs. the one that didn't.",
  },
  {
    key: "approved_just_in_time",
    label: "Approved Just in Time",
    description: "Someone got approved right before it was too late — age cutoff, health change, rate increase.",
    narrativeArc: "Close call → Near-miss → Relief of approval → Urgency for viewer",
    bestPersonas: ["direct_testimonial_narrator", "family_friend"],
    bestTriggers: ["urgency", "scarcity", "simplicity"],
    promptHint: "Create a 'just in time' narrative. 'I almost waited too long. Don't make the same mistake I almost did.'",
  },
  {
    key: "quiet_widow_testimonial",
    label: "Quiet Widow Testimonial",
    description: "A widow calmly shares how her husband's plan saved her from financial ruin.",
    narrativeArc: "Loss → Fear → Discovery that he planned → Gratitude and relief",
    bestPersonas: ["widow"],
    bestTriggers: ["guilt_avoidance", "loss_aversion", "legitimacy"],
    promptHint: "Slow, quiet, reflective. Let the emotion carry the story. Minimal music. Close-up shots.",
  },
  {
    key: "church_funeral_revelation",
    label: "Church Funeral Revelation",
    description: "At a church funeral, the reality of being unprepared hits home — sparking action.",
    narrativeArc: "Funeral scene → Realization → Conversation with pastor/friend → Decision to act",
    bestPersonas: ["pastor", "funeral_attendee", "neighbor"],
    bestTriggers: ["social_proof", "guilt_avoidance", "authority"],
    promptHint: "Set the scene at a small church funeral. Use the pastor or a friend to deliver the wake-up call.",
  },
  {
    key: "family_protected_after_death",
    label: "Family Protected After Death",
    description: "After someone passes, the family discovers they were protected all along.",
    narrativeArc: "Death → Fear and grief → Discovery of coverage → Relief and love",
    bestPersonas: ["grandson", "daughter", "widow"],
    bestTriggers: ["loss_aversion", "guilt_avoidance", "autonomy"],
    promptHint: "The reveal: 'We didn't know she had done this for us.' Make it feel like a gift from beyond.",
  },
  {
    key: "approval_letter_discovery",
    label: "Approval Letter Discovery",
    description: "Someone finds their approval letter and realizes how easy the process was.",
    narrativeArc: "Skepticism → One phone call → Approval letter arrives → Amazement at simplicity",
    bestPersonas: ["direct_testimonial_narrator", "family_friend"],
    bestTriggers: ["simplicity", "legitimacy", "affordability"],
    promptHint: "Focus on the physical letter as a prop. 'I couldn't believe it. One call, no exam, and this showed up in my mailbox.'",
  },
  {
    key: "phone_call_relief",
    label: "Phone Call Relief",
    description: "The moment of making the call and feeling immediate relief — the weight lifting.",
    narrativeArc: "Worry → Hesitation → Making the call → Instant relief",
    bestPersonas: ["direct_testimonial_narrator", "widow", "neighbor"],
    bestTriggers: ["simplicity", "autonomy", "affordability"],
    promptHint: "Build tension before the call, then release. 'I picked up the phone, and in five minutes, it was done.'",
  },
  {
    key: "hidden_benefit_nobody_talks_about",
    label: "Hidden Benefit Nobody Talks About",
    description: "A little-known benefit or program that most people miss — positioned as a secret.",
    narrativeArc: "Secret revealed → Disbelief → Validation → Call to claim",
    bestPersonas: ["son_who_works_with_state", "funeral_director"],
    bestTriggers: ["conspiracy_insider", "authority", "value_disparity"],
    promptHint: "Lead with 'Nobody's talking about this.' Create information asymmetry — viewer is now 'in the know'.",
  },
  {
    key: "authority_figure_told_me_to_call",
    label: "Authority Figure Told Me to Call",
    description: "A trusted authority (pastor, doctor, state worker) recommended making the call.",
    narrativeArc: "Trust in authority → Recommendation → Action → Validation",
    bestPersonas: ["pastor", "funeral_director", "son_who_works_with_state"],
    bestTriggers: ["authority", "social_proof", "legitimacy"],
    promptHint: "The authority figure acts as the catalyst. 'My pastor told me I needed to make this call. I'm glad I listened.'",
  },
  {
    key: "love_that_keeps_taking_care_of_family",
    label: "Love That Keeps Taking Care of Family",
    description: "Final expense coverage framed as an ongoing act of love — protection that outlasts you.",
    narrativeArc: "Love in life → Fear of leaving → Coverage as continuation of love → Peace",
    bestPersonas: ["widow", "grandson", "daughter"],
    bestTriggers: ["guilt_avoidance", "autonomy", "loss_aversion"],
    promptHint: "Frame the policy as love made permanent. 'Even when I'm gone, I'll still be taking care of them.'",
  },
];

export function getArchetypeByKey(key: string): ArchetypeSeed | undefined {
  return archetypes.find((a) => a.key === key);
}

export function getArchetypesByPersona(personaKey: string): ArchetypeSeed[] {
  return archetypes.filter((a) => a.bestPersonas.includes(personaKey));
}

export function getArchetypesByTrigger(triggerKey: string): ArchetypeSeed[] {
  return archetypes.filter((a) => a.bestTriggers.includes(triggerKey));
}
