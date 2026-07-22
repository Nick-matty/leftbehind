export type PhraseLang = 'sw' | 'ar' | 'fr' | 'es' | 'ja' | 'th' | 'tr';

export const PHRASE_LANGS: { code: PhraseLang; label: string }[] = [
  { code: 'sw', label: 'Swahili' },
  { code: 'ar', label: 'Arabic' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'ja', label: 'Japanese' },
  { code: 'th', label: 'Thai' },
  { code: 'tr', label: 'Turkish' },
];

const PHRASES: { en: string; translations: Record<PhraseLang, string> }[] = [
  { en: 'Hello', translations: { sw: 'Jambo / Habari', ar: 'مرحبا', fr: 'Bonjour', es: 'Hola', ja: 'こんにちは', th: 'สวัสดี', tr: 'Merhaba' } },
  { en: 'Thank you', translations: { sw: 'Asante', ar: 'شكراً', fr: 'Merci', es: 'Gracias', ja: 'ありがとう', th: 'ขอบคุณ', tr: 'Teşekkürler' } },
  { en: 'Help', translations: { sw: 'Saidia', ar: 'مساعدة', fr: 'Au secours', es: 'Ayuda', ja: '助けて', th: 'ช่วยด้วย', tr: 'Yardım' } },
  { en: 'Hospital', translations: { sw: 'Hospitali', ar: 'مستشفى', fr: 'Hôpital', es: 'Hospital', ja: '病院', th: 'โรงพยาบาล', tr: 'Hastane' } },
  { en: 'Taxi', translations: { sw: 'Teksi', ar: 'تاكسي', fr: 'Taxi', es: 'Taxi', ja: 'タクシー', th: 'แท็กซี่', tr: 'Taksi' } },
  { en: 'Restaurant', translations: { sw: 'Mgahawa', ar: 'مطعم', fr: 'Restaurant', es: 'Restaurante', ja: 'レストラン', th: 'ร้านอาหาร', tr: 'Restoran' } },
  { en: 'How much?', translations: { sw: 'Bei gani?', ar: 'بكم؟', fr: 'Combien?', es: '¿Cuánto cuesta?', ja: 'いくらですか', th: 'เท่าไหร่', tr: 'Ne kadar?' } },
  { en: 'Where is the bathroom?', translations: { sw: 'Choo kiko wapi?', ar: 'أين الحمام؟', fr: 'Où sont les toilettes?', es: '¿Dónde está el baño?', ja: 'トイレはどこですか', th: 'ห้องน้ำอยู่ไหน', tr: 'Tuvalet nerede?' } },
  { en: 'I need a doctor', translations: { sw: 'Nahitaji daktari', ar: 'أحتاج طبيباً', fr: "J'ai besoin d'un médecin", es: 'Necesito un médico', ja: '医者が必要です', th: 'ฉันต้องการหมอ', tr: 'Doktora ihtiyacım var' } },
  { en: 'Goodbye', translations: { sw: 'Kwaheri', ar: 'مع السلامة', fr: 'Au revoir', es: 'Adiós', ja: 'さようなら', th: 'ลาก่อน', tr: 'Hoşça kal' } },
];

export function getPhrases(lang: PhraseLang) {
  return PHRASES.map((p) => ({ en: p.en, local: p.translations[lang] }));
}

export function phraseLangForCountry(country: string): PhraseLang {
  const c = country.toLowerCase();
  if (c.includes('tanzania') || c.includes('kenya') || c.includes('zanzibar')) return 'sw';
  if (c.includes('uae') || c.includes('egypt') || c.includes('morocco') || c.includes('qatar')) return 'ar';
  if (c.includes('france') || c.includes('senegal')) return 'fr';
  if (c.includes('spain') || c.includes('mexico') || c.includes('argentina')) return 'es';
  if (c.includes('japan')) return 'ja';
  if (c.includes('thailand')) return 'th';
  if (c.includes('turkey')) return 'tr';
  return 'sw';
}
