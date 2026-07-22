import { findWeather, formatWeatherReply } from './weatherData';
import { suggestPacking, type Activity } from './smartPacking';
import { fetchLiveWeather, fetchLiveWeatherForPlace, formatLiveWeatherReply } from './liveWeather';
import { refreshRatesIfStale } from './liveRates';
import { convert, currencyForCountry, CURRENCY_META } from './currency';
import type { KnowledgeFact, AssistantReminder, UserMemory } from '../store/assistantStore';
import type { PersonalProfile } from '../store/settingsStore';
import {
  AssistantStyle,
  DEFAULT_ASSISTANT_STYLE,
  personaGreeting,
  styleAssistantReply,
} from '../data/assistantPersona';

export interface AssistantContext {
  userName?: string;
  destination?: string;
  country?: string;
  startDate?: string;
  checkOutTime?: string;
  packingProgress?: number;
  knowledge: KnowledgeFact[];
  reminders: AssistantReminder[];
  memories: UserMemory[];
  personal: PersonalProfile;
  online: boolean;
  style?: AssistantStyle;
}

export interface BrainResult {
  reply: string;
  effects?: {
    reminder?: { text: string; minutesFromNow: number };
    scheduleLocalNotification?: boolean;
    remember?: string;
    forgetQuery?: string;
    profilePatch?: Partial<PersonalProfile>;
  };
}

function minutesFromPhrase(text: string): number | null {
  const inMin = text.match(/in\s+(\d+)\s*(minutes?|mins?|m)\b/i);
  if (inMin) return Number(inMin[1]);
  const inHours = text.match(/in\s+(\d+)\s*(hours?|hrs?|h)\b/i);
  if (inHours) return Number(inHours[1]) * 60;
  const inDays = text.match(/in\s+(\d+)\s*(days?|d)\b/i);
  if (inDays) return Number(inDays[1]) * 60 * 24;
  if (/\b(tonight|this evening)\b/i.test(text)) return 180;
  if (/\btomorrow\b/i.test(text)) return 60 * 12;
  return null;
}

function matchKnowledge(q: string, knowledge: KnowledgeFact[]): string | null {
  const words = q.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  let best: KnowledgeFact | null = null;
  let score = 0;
  for (const fact of knowledge) {
    const hay = fact.text.toLowerCase();
    const hits = words.filter((w) => hay.includes(w)).length;
    if (hits > score) {
      score = hits;
      best = fact;
    }
  }
  return score >= 2 && best ? best.text : null;
}

function matchMemories(q: string, memories: UserMemory[]): UserMemory[] {
  const words = q.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
  return memories
    .map((m) => {
      const hay = m.text.toLowerCase();
      const hits = words.filter((w) => hay.includes(w)).length;
      return { m, hits };
    })
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .map((x) => x.m);
}

function ageLine(personal: PersonalProfile): string {
  return personal.age != null ? `${personal.age}` : 'unknown age';
}

export function describeUser(ctx: AssistantContext): string {
  const p = ctx.personal;
  const name = ctx.userName?.trim() || 'friend';
  const parts: string[] = [`You're talking to ${name}`];
  if (p.age != null) parts.push(`age ${p.age}`);
  if (p.nationality) parts.push(`from ${p.nationality}`);
  if (p.homeCurrency) parts.push(`home currency ${p.homeCurrency}`);
  if (p.travelStyle) parts.push(`${p.travelStyle} traveler`);
  if (p.hobbies.length) parts.push(`hobbies: ${p.hobbies.join(', ')}`);
  if (p.interests.length) parts.push(`interests: ${p.interests.join(', ')}`);
  if (p.traits.length) parts.push(`traits: ${p.traits.join(', ')}`);
  if (p.aboutMe.trim()) parts.push(`bio: ${p.aboutMe.trim()}`);
  if (ctx.memories.length) {
    parts.push(
      `remembered notes: ${ctx.memories
        .slice(0, 8)
        .map((m) => m.text)
        .join('; ')}`
    );
  }
  return parts.join(' · ');
}

function personalGreeting(ctx: AssistantContext): string {
  const name = ctx.userName?.split(/\s+/)[0] || 'there';
  const style = ctx.style ?? DEFAULT_ASSISTANT_STYLE;
  return personaGreeting(name, style, {
    nationality: ctx.personal.nationality,
    hobbies: ctx.personal.hobbies,
  });
}

function finish(reply: string, ctx: AssistantContext, effects?: BrainResult['effects']): BrainResult {
  const style = ctx.style ?? DEFAULT_ASSISTANT_STYLE;
  return { reply: styleAssistantReply(reply, style), effects };
}

function extractRememberText(raw: string): string | null {
  const m = raw.match(
    /^(?:please\s+)?(?:remember|note|learn)\s+(?:that\s+|this\s+)?(.+)$/i
  );
  return m?.[1]?.trim() || null;
}

function extractListItems(raw: string, kind: 'hobby' | 'interest' | 'trait'): string[] {
  const re =
    kind === 'hobby'
      ? /(?:my hobbies? (?:are|is)|i (?:like|love|enjoy))\s+(.+)/i
      : kind === 'interest'
        ? /(?:i(?:'m| am) interested in|my interests? (?:are|is))\s+(.+)/i
        : /(?:i(?:'m| am)|my traits? (?:are|is))\s+(.+)/i;
  const m = raw.match(re);
  if (!m) return [];
  return m[1]
    .split(/,| and /i)
    .map((s) => s.replace(/[.?！!]+$/g, '').trim())
    .filter((s) => s.length > 1 && s.length < 40)
    .slice(0, 6);
}

export async function runAssistant(input: string, ctx: AssistantContext): Promise<BrainResult> {
  const raw = input.trim();
  const q = raw.toLowerCase();
  if (!raw) {
    return finish(personalGreeting(ctx), ctx);
  }

  // —— Who am I / profile recall ——
  if (
    /\b(who am i|what do you know about me|tell me about myself|my profile|about me)\b/i.test(q)
  ) {
    return finish(
      describeUser(ctx) +
        (ctx.memories.length
          ? `\n\nI keep ${ctx.memories.length} personal note${ctx.memories.length === 1 ? '' : 's'} — say “forget …” to drop one.`
          : '\n\nTell me more anytime: “remember that I hate early flights” or “I love hiking”.'),
      ctx
    );
  }

  // —— Explicit memory write ——
  const rememberText = extractRememberText(raw);
  if (rememberText) {
    return finish(
      `Got it — I’ll remember: “${rememberText}”. You can ask “what do you know about me?” anytime.`,
      ctx,
      { remember: rememberText }
    );
  }

  if (/\bforget\b/i.test(q)) {
    const target =
      raw.replace(/^.*?\bforget\b(?:\s+that|\s+about)?\s*/i, '').trim() || q;
    return finish(
      target
        ? `Okay — I’ll forget notes matching “${target}”.`
        : 'Tell me what to forget, e.g. “forget early flights”.',
      ctx,
      target ? { forgetQuery: target } : undefined
    );
  }

  // —— Soft preference learning ——
  const hobbyAdds = extractListItems(raw, 'hobby');
  if (hobbyAdds.length && /\b(like|love|enjoy|hobby|hobbies)\b/i.test(q)) {
    const merged = Array.from(new Set([...ctx.personal.hobbies, ...hobbyAdds])).slice(0, 20);
    return finish(
      `Nice — I’ll keep your hobbies in mind: ${merged.join(', ')}. That’ll color packing & trip ideas.`,
      ctx,
      {
        profilePatch: { hobbies: merged },
        remember: `Hobbies: ${hobbyAdds.join(', ')}`,
      }
    );
  }

  const interestAdds = extractListItems(raw, 'interest');
  if (interestAdds.length && /\binterest/i.test(q)) {
    const merged = Array.from(new Set([...ctx.personal.interests, ...interestAdds])).slice(0, 20);
    return finish(
      `Noted your interests: ${merged.join(', ')}.`,
      ctx,
      {
        profilePatch: { interests: merged },
        remember: `Interests: ${interestAdds.join(', ')}`,
      }
    );
  }

  // —— Memory recall by topic ——
  if (/\b(do you remember|what did i (?:tell|say)|recall)\b/i.test(q)) {
    const hits = matchMemories(q, ctx.memories);
    if (hits.length) {
      return finish(
        `Here’s what I remember:\n` + hits.slice(0, 6).map((m, i) => `${i + 1}. ${m.text}`).join('\n'),
        ctx
      );
    }
    if (ctx.memories.length) {
      return finish(
        `I have ${ctx.memories.length} notes, but nothing matched that. Recent ones:\n` +
          ctx.memories
            .slice(0, 5)
            .map((m, i) => `${i + 1}. ${m.text}`)
            .join('\n'),
        ctx
      );
    }
    return finish(
      'I don’t have personal notes yet. Say “remember that …” and I’ll keep it.',
      ctx
    );
  }

  // —— Weather (live when online) ——
  if (/\b(weather|forecast|temperature|rain|hot|cold|climate)\b/i.test(q)) {
    const destMatch = raw.match(/(?:in|for|at)\s+([A-Za-z\s]+?)(?:\?|$)/i);
    const destination = destMatch?.[1]?.trim() || ctx.destination;
    if (ctx.online) {
      try {
        const live = destination
          ? await fetchLiveWeatherForPlace(destination)
          : await fetchLiveWeather();
        if (live) {
          const hobbyTip =
            ctx.personal.hobbies.includes('Beach') && live.tempC >= 24
              ? '\n\nBeach weather vibes — sunscreen’s a must for you.'
              : ctx.personal.hobbies.includes('Hiking') && live.tempC <= 18
                ? '\n\nCool for hiking — pack layers.'
                : '';
          return finish(formatLiveWeatherReply(live, true) + hobbyTip, ctx);
        }
      } catch {
        /* fall through to offline seed */
      }
    }
    const weather = findWeather(destination, ctx.country);
    const custom = ctx.knowledge.find(
      (k) =>
        k.text.toLowerCase().includes((destination || weather.destination).toLowerCase()) &&
        /\b(weather|°c|rain|temp|july|climate)\b/i.test(k.text)
    );
    const base = formatWeatherReply(weather);
    const offlineNote = ctx.online
      ? ''
      : '\n\n(You’re offline — this is a climate snapshot. Go online for a live forecast.)';
    return finish((custom ? `${base}\n\nAlso: ${custom.text}` : base) + offlineNote, ctx);
  }

  // —— Currency / FX ——
  if (/\b(currency|exchange|fx|convert|how much is|exchange rate)\b/i.test(q)) {
    const home = ctx.personal.homeCurrency || 'USD';
    const tripCur = currencyForCountry(ctx.country || ctx.destination || '');
    if (ctx.online) {
      await refreshRatesIfStale();
    }
    const amountMatch = raw.match(/(\d+(?:\.\d+)?)\s*([A-Z]{3})\b/i);
    if (amountMatch) {
      const amount = Number(amountMatch[1]);
      const from = amountMatch[2].toUpperCase();
      const toMatch = raw.match(/\bto\s+([A-Z]{3})\b/i);
      const to = (toMatch?.[1] || (from === home ? tripCur : home)).toUpperCase();
      const value = convert(amount, from, to);
      if (value != null) {
        return finish(
          `${amount} ${from} ≈ ${value.toFixed(2)} ${to}` +
            (ctx.online ? ' (rates refreshed online when possible).' : ' (offline rate snapshot).') +
            (CURRENCY_META[to] ? `\nTip: ${CURRENCY_META[to].tipping}` : ''),
          ctx
        );
      }
    }
    const sample = convert(100, home, tripCur);
    return finish(
      `Your home currency is ${home}. Destination side often uses ${tripCur}.` +
        (sample != null ? ` Roughly 100 ${home} ≈ ${sample.toFixed(2)} ${tripCur}.` : '') +
        ` Try: “convert 50 ${home} to ${tripCur}”.` +
        (ctx.online ? '' : ' (Online refreshes live ECB rates.)'),
      ctx
    );
  }

  if (/\b(my reminders|list reminders|what reminders|upcoming reminders)\b/i.test(q)) {
    const open = ctx.reminders.filter((r) => !r.done);
    if (open.length === 0) {
      return finish(
        'No open reminders. Try: “remind me in 30 minutes to check the checklist”.',
        ctx
      );
    }
    return finish(
      'Your reminders:\n' +
        open
          .slice(0, 8)
          .map((r, i) => `${i + 1}. ${r.text} · ${new Date(r.dueAt).toLocaleString()}`)
          .join('\n'),
      ctx
    );
  }

  if (/\bremind( me)?\b/i.test(q) || /\bset a reminder\b/i.test(q)) {
    const minutes = minutesFromPhrase(q) ?? 30;
    const text =
      raw.replace(/^.*?\bremind(?: me)?(?: to)?\b/i, '').replace(/\bin\s+\d+\s*\w+/i, '').trim() ||
      'Check your packing list';
    return finish(`Okay — I’ll remind you in ${minutes} minute${minutes === 1 ? '' : 's'}: ${text}.`, ctx, {
      reminder: { text, minutesFromNow: minutes },
      scheduleLocalNotification: true,
    });
  }

  if (/\b(pack|packing|what should i bring|checklist)\b/i.test(q)) {
    const activities: Activity[] = ['city'];
    if (ctx.personal.hobbies.includes('Beach') || ctx.personal.hobbies.includes('Diving')) {
      activities.unshift('beach');
    }
    if (ctx.personal.hobbies.includes('Hiking') || ctx.personal.hobbies.includes('Camping')) {
      activities.unshift('hiking');
    }
    if (ctx.personal.travelStyle === 'business') activities.unshift('business');
    const result = suggestPacking({
      destination: ctx.destination || 'your trip',
      country: ctx.country,
      days: 5,
      activities: activities.slice(0, 3),
    });
    const progress =
      ctx.packingProgress != null ? ` Your packing readiness is ${ctx.packingProgress}%.` : '';
    const styleTip = ctx.personal.travelStyle
      ? ` Tuned for your ${ctx.personal.travelStyle} travel style${
          ctx.personal.traits.includes('Minimalist') ? ' (keeping it light)' : ''
        }.`
      : '';
    const memHits = matchMemories('pack packing clothes', ctx.memories);
    const memTip = memHits[0] ? `\n\nFrom what I know about you: ${memHits[0].text}` : '';
    return finish(`${result.summary}${progress}${styleTip}${memTip}`, ctx);
  }

  if (/\b(trip|itinerary|checkout|check-?out|check-?in)\b/i.test(q)) {
    if (!ctx.destination) {
      return finish('No upcoming trip yet. Create one under Trips, then ask me again.', ctx);
    }
    const homeNote = ctx.personal.nationality
      ? ` Coming from ${ctx.personal.nationality}, watch local customs & currency (${ctx.personal.homeCurrency || currencyForCountry(ctx.country || '')}).`
      : '';
    return finish(
      `Your upcoming trip is ${ctx.destination}${ctx.country ? `, ${ctx.country}` : ''}` +
        `${ctx.startDate ? ` starting ${ctx.startDate}` : ''}` +
        `${ctx.checkOutTime ? `. Checkout around ${ctx.checkOutTime}` : ''}.` +
        (ctx.packingProgress != null ? ` Packing readiness: ${ctx.packingProgress}%.` : '') +
        homeNote,
      ctx
    );
  }

  if (/\b(hello|hi|hey|good morning|good evening)\b/i.test(q)) {
    return finish(personalGreeting(ctx), ctx);
  }

  const fromMemory = matchMemories(q, ctx.memories)[0]?.text ?? matchKnowledge(q, ctx.knowledge);
  if (fromMemory) {
    return finish(fromMemory, ctx);
  }

  if (/\b(help|what can you do|commands)\b/i.test(q)) {
    return finish(
      `I'm your personal travel friend (${ageLine(ctx.personal)}${ctx.personal.nationality ? `, ${ctx.personal.nationality}` : ''}). I can:\n` +
        '• Live weather & forecasts (online)\n' +
        '• Packing ideas tuned to your hobbies\n' +
        '• Currency tips using your home currency\n' +
        '• Trip status & reminders\n' +
        '• Remember facts: “remember that I prefer window seats”\n' +
        '• Recall: “what do you know about me?”\n' +
        '• Voice via the mic',
      ctx
    );
  }

  const name = ctx.userName?.split(/\s+/)[0] || 'friend';
  return finish(
    `Hmm ${name}, try weather, packing, currency, your trip, or “remember that…”. I’m here as your travel buddy — ask “what do you know about me?” anytime.`,
    ctx
  );
}
