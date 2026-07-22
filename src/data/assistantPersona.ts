/** AI companion personality, spoken voice, and slang presets. */

export type PersonaId = 'warm' | 'chill' | 'pro' | 'buddy';
export type VoiceToneId = 'soft' | 'bright' | 'calm' | 'energetic';
export type SlangId = 'neutral' | 'casual' | 'street' | 'travel';

export interface AssistantStyle {
  persona: PersonaId;
  voice: VoiceToneId;
  slang: SlangId;
}

export const DEFAULT_ASSISTANT_STYLE: AssistantStyle = {
  persona: 'warm',
  voice: 'soft',
  slang: 'casual',
};

export const PERSONA_OPTIONS: {
  id: PersonaId;
  label: string;
  blurb: string;
}[] = [
  { id: 'warm', label: 'Warm companion', blurb: 'Caring, encouraging, like a travel buddy who checks on you.' },
  { id: 'chill', label: 'Chill guide', blurb: 'Relaxed and easygoing — low stress, high vibes.' },
  { id: 'pro', label: 'Pro planner', blurb: 'Clear, confident, trip-ops energy without the fluff.' },
  { id: 'buddy', label: 'Best friend', blurb: 'Playful and supportive — celebrates wins with you.' },
];

export const VOICE_OPTIONS: {
  id: VoiceToneId;
  label: string;
  blurb: string;
  rate: number;
  pitch: number;
}[] = [
  { id: 'soft', label: 'Soft human', blurb: 'Gentle and natural', rate: 0.9, pitch: 1.02 },
  { id: 'bright', label: 'Bright', blurb: 'Friendly and upbeat', rate: 0.96, pitch: 1.08 },
  { id: 'calm', label: 'Calm', blurb: 'Steady and grounded', rate: 0.86, pitch: 0.96 },
  { id: 'energetic', label: 'Energetic', blurb: 'Lively trip hype', rate: 1.02, pitch: 1.12 },
];

export const SLANG_OPTIONS: {
  id: SlangId;
  label: string;
  blurb: string;
}[] = [
  { id: 'neutral', label: 'Neutral', blurb: 'Plain clear English' },
  { id: 'casual', label: 'Casual', blurb: 'Everyday friendly chat' },
  { id: 'street', label: 'Slangy', blurb: 'Laid-back slang (still respectful)' },
  { id: 'travel', label: 'Traveler talk', blurb: 'Wanderlust lingo & packing speak' },
];

export function getVoiceTone(id: VoiceToneId) {
  return VOICE_OPTIONS.find((v) => v.id === id) ?? VOICE_OPTIONS[0];
}

export function getPersona(id: PersonaId) {
  return PERSONA_OPTIONS.find((p) => p.id === id) ?? PERSONA_OPTIONS[0];
}

export function getSlang(id: SlangId) {
  return SLANG_OPTIONS.find((s) => s.id === id) ?? SLANG_OPTIONS[0];
}

/** Soften robotic phrasing and tint wording to match slang + persona. */
export function styleAssistantReply(raw: string, style: AssistantStyle): string {
  let text = raw.trim();
  if (!text) return text;

  // Strip stiff assistant-isms
  text = text
    .replace(/\bI will\b/g, "I'll")
    .replace(/\bI am\b/g, "I'm")
    .replace(/\bcannot\b/gi, "can't")
    .replace(/\bdo not\b/gi, "don't")
    .replace(/\bOkay —\s*/g, 'Okay — ')
    .replace(/\bHmm,\s*/g, 'Hmm — ');

  const nameFriendly = style.persona === 'buddy' || style.persona === 'warm';

  if (style.slang === 'street') {
    text = text
      .replace(/\bHello\b/g, 'Yo')
      .replace(/\bHey there\b/gi, 'Hey')
      .replace(/\bGot it\b/g, 'Bet')
      .replace(/\bOkay\b/g, 'Aight')
      .replace(/\bVery\b/g, 'Super')
      .replace(/\bI don't have\b/gi, "I ain't got")
      .replace(/\bNo open reminders\b/g, 'No reminders lined up');
  } else if (style.slang === 'casual') {
    text = text
      .replace(/\bHello\b/g, 'Hey')
      .replace(/\bGot it — I'll remember\b/g, "Gotchu — I'll remember")
      .replace(/\bYour home currency is\b/g, 'Your usual currency is');
  } else if (style.slang === 'travel') {
    text = text
      .replace(/\bpacking readiness\b/gi, 'pack score')
      .replace(/\bupcoming trip\b/gi, 'next adventure')
      .replace(/\bdestination\b/gi, 'spot');
  }

  if (style.persona === 'chill' && !/\b(no stress|easy|chill|we're good)\b/i.test(text)) {
    if (/^Okay/i.test(text) || /^Got/i.test(text)) {
      text = text.replace(/^(Okay|Gotchu|Got it|Aight|Bet)/i, '$1 — no stress');
    }
  }

  if (style.persona === 'pro') {
    text = text.replace(/\bTry:\s*/gi, 'Next step: ').replace(/\banytime\b/gi, 'when you need');
  }

  if (style.persona === 'buddy' && nameFriendly && text.length < 220 && !/[!?]$/.test(text)) {
    text = `${text} ✨`;
  }

  if (style.persona === 'warm' && /\bPacking readiness\b/i.test(text)) {
    text = text.replace(/\bPacking readiness\b/i, "You're packing");
  }

  return text;
}

export function personaGreeting(
  firstName: string,
  style: AssistantStyle,
  extras?: { nationality?: string; hobbies?: string[] }
): string {
  const name = firstName || 'there';
  const hobby = extras?.hobbies?.slice(0, 2).join(' & ');
  const from = extras?.nationality;

  switch (style.persona) {
    case 'chill':
      return (
        `Hey ${name}. I'm here whenever — weather, packing, money, your trip.` +
        (hobby ? ` Love that you're into ${hobby}.` : '') +
        ` Say “remember that…” if you want me to keep something.`
      );
    case 'pro':
      return (
        `${name}, ready when you are. I can pull live weather, packing plans, FX, trip status, and reminders.` +
        (from ? ` Noted: you're from ${from}.` : '') +
        ` Ask “what do you know about me?” to review your profile.`
      );
    case 'buddy':
      return (
        `Heyyy ${name}! Your travel sidekick is online.` +
        (hobby ? ` ${hobby}? We're gonna pack smart for that.` : '') +
        ` Hit me with weather, packing, or “remember that…” — I got you.`
      );
    case 'warm':
    default:
      return (
        `Hey ${name}! I'm your personal LeftBehind companion.` +
        (from ? ` I know you're from ${from}.` : '') +
        (hobby ? ` And you're into ${hobby}.` : '') +
        ` Ask about weather, packing, money, your trip — or say “remember that…” so I can learn more about you.`
      );
  }
}
