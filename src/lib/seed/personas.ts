export interface PersonaSeed {
  key: string;
  label: string;
  description: string;
  relationship: "family" | "community" | "professional" | "self";
  voiceTone: string;
  promptHint: string;
}

export const personas: PersonaSeed[] = [
  {
    key: "widow",
    label: "Widow",
    description: "A woman who lost her husband and experienced the financial aftermath firsthand.",
    relationship: "family",
    voiceTone: "Soft, reflective, emotionally grounded",
    promptHint: "Speak from lived experience of loss. Reference the bills, the shock, the wish she had been prepared.",
  },
  {
    key: "daughter",
    label: "Daughter",
    description: "An adult daughter who had to handle her parent's funeral costs.",
    relationship: "family",
    voiceTone: "Caring, slightly urgent, protective",
    promptHint: "Tell the story from the child's perspective — scrambling to pay, wishing mom or dad had planned ahead.",
  },
  {
    key: "son_who_works_with_state",
    label: "Son (Works with the State)",
    description: "A son with insider knowledge of state programs, lending authority to the message.",
    relationship: "family",
    voiceTone: "Confident, knowledgeable, insider-ish",
    promptHint: "Combine family concern with insider authority. 'I work with the state, and I can tell you most people don't know about this.'",
  },
  {
    key: "grandson",
    label: "Grandson",
    description: "A young adult grandson honoring a grandparent's legacy and foresight.",
    relationship: "family",
    voiceTone: "Warm, grateful, reverent",
    promptHint: "Reflect on grandma/grandpa's wisdom. 'She made one phone call, and because of that, we didn't have to worry.'",
  },
  {
    key: "neighbor",
    label: "Neighbor",
    description: "A trusted neighbor sharing what happened on their street — social proof through proximity.",
    relationship: "community",
    voiceTone: "Conversational, relatable, matter-of-fact",
    promptHint: "Use 'over the fence' language. 'My neighbor down the street told me about this, and I'm glad she did.'",
  },
  {
    key: "funeral_attendee",
    label: "Funeral Attendee",
    description: "Someone who attended a funeral and saw the family struggle — a cautionary witness.",
    relationship: "community",
    voiceTone: "Solemn, cautionary, empathetic",
    promptHint: "Describe the scene at a funeral where the family was clearly struggling. Use it as a warning to prepare.",
  },
  {
    key: "pastor",
    label: "Pastor",
    description: "A faith leader who has seen families in crisis and speaks with moral authority.",
    relationship: "professional",
    voiceTone: "Gentle, authoritative, pastoral",
    promptHint: "Speak with the weight of having counseled grieving families. Frame preparation as an act of love and stewardship.",
  },
  {
    key: "funeral_director",
    label: "Funeral Director",
    description: "A funeral industry professional who sees unprepared families every day.",
    relationship: "professional",
    voiceTone: "Professional, direct, compassionate",
    promptHint: "Share what happens when families come in with no plan and no money. Provide the cost reality check.",
  },
  {
    key: "family_friend",
    label: "Family Friend",
    description: "A close family friend who helped during a difficult time and learned a lesson.",
    relationship: "community",
    voiceTone: "Warm, anecdotal, persuasive",
    promptHint: "Tell a personal story about helping a friend's family after a death. 'I saw what happened, and I swore I'd never let that happen to my family.'",
  },
  {
    key: "direct_testimonial_narrator",
    label: "Direct Testimonial Narrator",
    description: "A first-person narrator speaking directly to camera about their own experience.",
    relationship: "self",
    voiceTone: "Authentic, direct, unscripted-feeling",
    promptHint: "Speak as if telling a friend. Raw, honest, no polish. 'Let me tell you what happened to me...'",
  },
];

export function getPersonaByKey(key: string): PersonaSeed | undefined {
  return personas.find((p) => p.key === key);
}

export function getPersonasByRelationship(relationship: PersonaSeed["relationship"]): PersonaSeed[] {
  return personas.filter((p) => p.relationship === relationship);
}
