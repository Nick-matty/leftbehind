import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import {
  AssistantStyle,
  DEFAULT_ASSISTANT_STYLE,
  getVoiceTone,
  VoiceToneId,
} from '../data/assistantPersona';

type ListenHandlers = {
  onStart?: () => void;
  onResult: (text: string) => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
};

let cachedVoiceId: string | null | undefined;
let cachedTone: VoiceToneId | null = null;

/** Pick a natural-sounding system voice when the OS exposes one. */
async function resolveHumanVoice(tone: VoiceToneId): Promise<string | undefined> {
  if (cachedVoiceId !== undefined && cachedTone === tone) {
    return cachedVoiceId ?? undefined;
  }
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const en = voices.filter(
      (v) =>
        (v.language || '').toLowerCase().startsWith('en') &&
        !/robot|compact|eloquence/i.test(`${v.name} ${v.identifier}`)
    );
    const pool = en.length ? en : voices;
    if (!pool.length) {
      cachedVoiceId = null;
      cachedTone = tone;
      return undefined;
    }

    const prefer =
      tone === 'soft' || tone === 'calm'
        ? [/samantha|karen|moira|serena|fiona|zira|susan|female|woman/i, /natural|premium|enhanced/i]
        : [/daniel|alex|tom|david|mark|male|man/i, /natural|premium|enhanced/i];

    let pick =
      pool.find((v) => prefer.some((re) => re.test(`${v.name} ${v.identifier}`))) ??
      pool.find((v) => /en-us|en_us|en-gb|en_gb/i.test(v.language)) ??
      pool[0];

    cachedVoiceId = pick.identifier || pick.name || null;
    cachedTone = tone;
    return cachedVoiceId ?? undefined;
  } catch {
    cachedVoiceId = null;
    cachedTone = tone;
    return undefined;
  }
}

/** Speak with a more human pace; optional style from Profile. */
export async function speak(
  text: string,
  enabled = true,
  style: AssistantStyle = DEFAULT_ASSISTANT_STYLE
) {
  if (!enabled || !text.trim()) return;
  const tone = getVoiceTone(style.voice);
  const voice = await resolveHumanVoice(style.voice);

  // Speak in short breaths so it doesn't sound like one flat robot line.
  const chunks = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?…])\s+/)
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, 8);

  const lines = chunks.length ? chunks : [text.trim()];

  try {
    Speech.stop();
    const speakChunk = (i: number) => {
      if (i >= lines.length) return;
      Speech.speak(lines[i], {
        language: 'en-US',
        voice,
        rate: tone.rate,
        pitch: tone.pitch,
        onDone: () => speakChunk(i + 1),
        onStopped: () => {},
        onError: () => speakChunk(i + 1),
      });
    };
    speakChunk(0);
  } catch {
    // Speech may be unavailable on some environments — ignore.
  }
}

export function stopSpeaking() {
  try {
    Speech.stop();
  } catch {
    /* ignore */
  }
}

/**
 * Start voice recognition.
 * Web: uses the browser SpeechRecognition API.
 * Native: returns false so the UI can fall back to typed commands
 * (full on-device STT needs a custom dev client / cloud STT).
 */
export function startListening(handlers: ListenHandlers): () => void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      handlers.onError?.(
        'Voice input is not supported in this browser. Type your command instead.'
      );
      return () => {};
    }
    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => handlers.onStart?.();
    recognition.onerror = (e: any) => {
      handlers.onError?.(
        e?.error === 'not-allowed'
          ? 'Microphone permission denied.'
          : 'Could not hear that — try again.'
      );
      handlers.onEnd?.();
    };
    recognition.onend = () => handlers.onEnd?.();
    recognition.onresult = (event: any) => {
      const text = event?.results?.[0]?.[0]?.transcript?.trim();
      if (text) handlers.onResult(text);
    };
    try {
      recognition.start();
    } catch {
      handlers.onError?.('Could not start the microphone.');
    }
    return () => {
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
    };
  }

  handlers.onError?.(
    'Voice typing works best in the web app or a build with speech recognition. You can still type commands — I will speak my replies.'
  );
  handlers.onEnd?.();
  return () => {};
}

export function voiceSupported() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return !!(
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    );
  }
  return false;
}
