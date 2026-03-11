import type { CinematicHookStyle } from "@/types/cinematic-hook";

export const CINEMATIC_HOOK_STYLES: CinematicHookStyle[] = [
  {
    id: "church-whispers",
    name: "Church Whispers",
    description: "Mourners whisper in disbelief at the widow's composure. Social proof through community observation.",
    hookType: "Social Tension",
    duration: 18,
    scenes: [
      {
        sceneLabel: "Church pew — two mourners whispering",
        rawImagePrompt: "Interior of a church, rows of pews. Two middle-aged Black women in the third pew, both wearing funeral black. One leans toward the other, lips close to her ear, eyes cutting sideways toward the front of the church. Long-lens compression. Shot from slightly behind, partial side view of their faces.",
        rawKlingPrompt: "[Fincher] Cold static shot from behind the pew. The woman on the left leans in slowly, whispers, eyes never moving from the front of the church. The other woman's brow furrows slightly in surprise, then she gives one slow nod.",
        soundNote: "Sound: muffled organ music, hushed whispering barely audible, the ambient hum of a full church",
      },
      {
        sceneLabel: "Widow in front row — composed, not looking back",
        rawImagePrompt: "Front pew of a church. An older Black woman sits upright in funeral black, hands folded in her lap. Her posture is composed, even dignified. She faces forward. The pews behind her are blurred. Warm stained-glass light from the left.",
        rawKlingPrompt: "[Spielberg] Slow push-in from slightly behind and to the side. The widow does not move — absolute stillness. The camera drifts forward. Her expression: quiet, certain, at peace.",
        soundNote: "Sound: whispering from behind her becomes slightly audible, but she does not react",
      },
    ],
  },
  {
    id: "bill-drop",
    name: "Bill Drop",
    description: "A funeral director slides an itemized bill across a desk. The financial reality of death — before the solution appears.",
    hookType: "Financial Shock",
    duration: 16,
    scenes: [
      {
        sceneLabel: "Funeral director's desk — bill sliding across",
        rawImagePrompt: "Dark wood desk in a funeral home office. A suited man's forearm enters from the right — only the arm is visible, no face. His hand slides a single sheet of paper across the desk toward camera. Close-up on the bottom of the page: a bold total line with a large dollar amount.",
        rawKlingPrompt: "[Fincher] Cold static wide of funeral home desk. The suited arm enters frame from the right and slides the invoice across in a single slow, deliberate motion. Camera does not move. Hold for 2 seconds after the paper settles.",
        soundNote: "Sound: paper sliding on wood, then silence — a clock somewhere, faint",
      },
      {
        sceneLabel: "Family member reads the bill — disbelief",
        rawImagePrompt: "Same desk. A woman's hand enters frame from below, picks up the invoice. The paper trembles slightly. Pull out just enough to show her face in partial profile as she reads: disbelief, mouth slightly open. Warm desk lamp light from above.",
        rawKlingPrompt: "[Spielberg] Slow push-in from a low angle as the woman picks up the paper. Her face enters the upper frame edge. Hold on her eyes moving across the invoice — then stopping. A long pause. Her expression locks. Tiny exhale through the nose.",
        soundNote: "Sound: near-silence — only her breath and the faint tick of the clock",
      },
    ],
  },
  {
    id: "phone-call-approval",
    name: "The Call",
    description: "A phone rings. The caller ID reads insurance company. What happens next changes everything.",
    hookType: "Surprise Relief",
    duration: 17,
    scenes: [
      {
        sceneLabel: "Phone rings on kitchen counter — caller ID visible",
        rawImagePrompt: "A smartphone on a kitchen counter, screen facing up, lit with an incoming call. The caller ID reads 'LIFE INSURANCE CO.' in bold. The phone vibrates slightly. Natural afternoon light through a kitchen window. Close-up.",
        rawKlingPrompt: "[Nolan] Static close-up — the phone vibrates once, twice. The screen pulses with light. A hand reaches into frame from the right and pauses just above the phone without picking it up yet. Hold for 2 seconds of tension.",
        soundNote: "Sound: phone vibration rattle on the hard counter, a single ring tone",
      },
      {
        sceneLabel: "Avatar answers — expression shifts from neutral to stunned relief",
        rawImagePrompt: "Medium close-up of an older woman holding a smartphone to her ear, standing in her kitchen. Her face is neutral, guarded. Soft kitchen window light. She is listening. No dialogue yet.",
        rawKlingPrompt: "[Spielberg] Slow push-in as she listens. Her brow is furrowed at first. Then as the caller speaks it slowly relaxes. Her eyes fill. Her free hand comes up to her mouth. She closes her eyes for one beat. Shoulders release. A single slow nod of acceptance.",
        soundNote: "Sound: the distant voice of the caller is audible but not intelligible — just warmth and tone",
      },
    ],
  },
  {
    id: "church-lady-fan",
    name: "Church Lady Fan",
    description: "An older church lady fans herself slowly. Her reaction says everything about what she's witnessing.",
    hookType: "Social Proof",
    duration: 15,
    scenes: [
      {
        sceneLabel: "Church lady fans herself — wide-eyed disbelief",
        rawImagePrompt: "A plump older Black woman in her Sunday best — large hat, pearl earrings, a church program used as a fan. She sits in a church pew. Her eyes are wide. She is fanning herself slowly, rhythmically. Expression: genuine, slightly scandalized disbelief mixed with reluctant admiration. Warm interior church light.",
        rawKlingPrompt: "[Scorsese] Motivated slow push-in from a slight angle as she fans. Her eyes cut sideways toward something off-frame. The fan continues its slow rhythm. A very slight head shake. Then she turns to her neighbor.",
        soundNote: "Sound: paper fan rustling, ambient church hum, muffled conversation",
      },
      {
        sceneLabel: "She leans to her neighbor — whispering",
        rawImagePrompt: "Same church setting. The church lady has leaned toward the woman beside her, close to her ear. Her expression has shifted to confidential urgency. The neighbor's eyebrows are raised in surprise. Long lens compression.",
        rawKlingPrompt: "[Fincher] Cold static hold on the two women. The church lady's lips move — she whispers for 2 seconds. The neighbor's eyes go wide. A slow nod between them. Complete stillness except the tiny movement of their faces.",
        soundNote: "Sound: the whisper is audible as breath but words are indistinct — a 'can you believe it' tone",
      },
    ],
  },
  {
    id: "sons-discovery",
    name: "Son's Discovery",
    description: "An adult son discovers something on his phone about benefits his family didn't know existed.",
    hookType: "Insider Knowledge",
    duration: 18,
    scenes: [
      {
        sceneLabel: "Son at kitchen table — phone screen shifts his expression",
        rawImagePrompt: "Young adult Black man, early 30s, sitting at a kitchen table. Laptop open, phone in his right hand. His face is lit by the phone screen. His expression changes: focused → surprised → eyes widen → emotional. Natural daytime kitchen light.",
        rawKlingPrompt: "[Spielberg] Slow push-in from slightly above and to the right as he reads his phone. We stay on his face — the screen content is never shown. His eyes move, then stop. A pause. His jaw tightens. Then releases. His free hand comes up to rub the back of his neck in quiet shock.",
        soundNote: "Sound: near-silence — the distant sound of a TV in another room, his breath",
      },
      {
        sceneLabel: "He shows his mother — her hand goes to her mouth",
        rawImagePrompt: "Same kitchen. The son stands beside an older woman — his mother — who is seated. He holds the phone in front of her. She leans in to look. Her reading glasses are on. As she reads, her hand slowly rises to cover her mouth. Her eyes fill.",
        rawKlingPrompt: "[Spielberg] Hold on the mother's face from a slight low angle. The son's arm holding the phone is visible at the edge of frame. When her hand comes up to her mouth, the camera makes one final tiny push-in and holds.",
        soundNote: "Sound: near-silence — only her soft intake of breath as she reads",
      },
    ],
  },
  {
    id: "sisters-confrontation",
    name: "Sister's Truth",
    description: "Two sisters face each other across a table. One asks the question no one in the family has said out loud.",
    hookType: "Family Conflict",
    duration: 17,
    scenes: [
      {
        sceneLabel: "Two sisters at a kitchen table — one confronts",
        rawImagePrompt: "Two middle-aged Black women sitting across from each other at a kitchen table. The one on the left leans forward, hands flat on the table, speaking directly. Expression: urgent, concerned, not angry. The woman on the right is looking away, arms crossed. Natural kitchen light.",
        rawKlingPrompt: "[Fincher] Cold, precise wide shot — both women in frame. The one on the left speaks. Words are not audible. The one on the right looks away. Hold. Then slowly the right woman turns back. The camera makes a single slow minimal push toward their faces.",
        soundNote: "Sound: the muffled voice of one sister, then silence — the refrigerator hum",
      },
      {
        sceneLabel: "The accused sister's expression softens to concern",
        rawImagePrompt: "Medium close-up on the second sister — she has turned back to face the first. Her arms are less crossed. Expression has moved from defensive to honest: fear, realization. She swallows. A beat of quiet between them.",
        rawKlingPrompt: "[Spielberg] Tight push-in on the second sister's face. Hold on the moment her expression changes — a micro-beat of vulnerability breaking through. The first sister's hand enters the lower frame and rests on the table between them. A gesture of connection.",
        soundNote: "Sound: near-silence — the sound of the table, a quiet exhale",
      },
    ],
  },
  {
    id: "casket-price-tag",
    name: "Casket Price Tag",
    description: "Inside a funeral showroom. A price tag hangs from a casket handle. The number is real.",
    hookType: "Financial Shock",
    duration: 15,
    scenes: [
      {
        sceneLabel: "Funeral home showroom — tracking through caskets",
        rawImagePrompt: "Interior of a funeral home casket showroom. Rows of caskets in different finishes — wood, metal, white. Overhead fluorescent lighting with a slightly clinical quality. No people in the frame. Shot from a low angle looking down the aisle.",
        rawKlingPrompt: "[Scorsese] Motivated tracking shot moving slowly down the aisle of the showroom, low angle. The camera follows the row of caskets. The movement is steady, almost funereal in its rhythm. We pass casket after casket. Then the camera stops.",
        soundNote: "Sound: near-silence — footsteps on tile, the subtle hum of air conditioning",
      },
      {
        sceneLabel: "Close-up on a price tag hanging from a casket",
        rawImagePrompt: "Extreme close-up. A white paper tag hanging from a casket handle by a thin string. The price is printed in large plain font — a number in the thousands. Shallow depth of field — only the tag and handle are sharp.",
        rawKlingPrompt: "[Fincher] Static close-up on the price tag. Absolute stillness. The tag swings almost imperceptibly in the air conditioning. Hold for 3 full seconds. The number is not going away.",
        soundNote: "Sound: complete near-silence — only the barely audible hum of the air system",
      },
    ],
  },
  {
    id: "calendar-countdown",
    name: "Calendar Countdown",
    description: "A calendar on the wall shows dates crossed out in red. Only a few remain. Something is coming.",
    hookType: "Urgency",
    duration: 15,
    scenes: [
      {
        sceneLabel: "Wall calendar — red X's crossing out dates",
        rawImagePrompt: "A standard paper wall calendar on a kitchen wall. Multiple dates in the current month are crossed out in thick red marker. A circled date near the end of the month has a word written beside it — partially visible. Natural light from a nearby window casts a slight shadow.",
        rawKlingPrompt: "[Nolan] Static hold on the calendar. The light from the window shifts very slightly as clouds pass — a slow, natural lighting change. The red X's dominate the frame. Hold for 2 seconds. Then slowly drift in toward the circled date at the end of the month.",
        soundNote: "Sound: near-silence — the barely audible tick of a clock, distant ambient sounds",
      },
      {
        sceneLabel: "Hand reaches in and X's out today's date",
        rawImagePrompt: "Same calendar, closer. A hand enters from the right holding a red marker. It moves to today's date and draws a slow X across it. The motion is deliberate, final. The rest of the month stretches beyond, uncrossed. Only 3-4 dates remain.",
        rawKlingPrompt: "[Fincher] Static close-up — the hand enters and draws the X with one controlled motion. No hurry. Hold after the hand withdraws. The new X sits among the others. The uncrossed dates at the end of the month seem to glow in contrast.",
        soundNote: "Sound: the marker squeaking on paper, then silence as the hand withdraws",
      },
    ],
  },
];

export function getCinematicHookStyleById(id: string): CinematicHookStyle | undefined {
  return CINEMATIC_HOOK_STYLES.find((s) => s.id === id);
}
