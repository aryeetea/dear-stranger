export const LETTER_RITUALS = [
  {
    id: 'comet',
    label: 'Comet Release',
    desc: 'Sent in a bright streak through the dark.',
  },
  {
    id: 'dawn',
    label: 'At Dawn',
    desc: 'Released with first light and a quiet promise.',
  },
  {
    id: 'moon-tide',
    label: 'Moon Tide',
    desc: 'Carried slowly by lunar pull and silver water.',
  },
  {
    id: 'candle',
    label: 'Candlewake',
    desc: 'Sealed by emberlight, warmth, and stillness.',
  },
  {
    id: 'storm',
    label: 'Storm Carried',
    desc: 'Sent with thunder in its chest and weather in its wake.',
  },
  {
    id: 'petals',
    label: 'Petal Drift',
    desc: 'Released softly, like something meant to land gently.',
  },
] as const

export type LetterRitualId = (typeof LETTER_RITUALS)[number]['id']

export const LETTER_WAX_SEALS = [
  { id: 'crimson', label: 'Crimson', color: '#8f1f2c', highlight: '#d77b88', accent: '#f3d9dd' },
  { id: 'pearl', label: 'Pearl', color: '#d7d1cb', highlight: '#f8f4ef', accent: '#7d7068' },
  { id: 'midnight', label: 'Midnight', color: '#20284f', highlight: '#7e8cc9', accent: '#dfe6ff' },
  { id: 'jade', label: 'Jade', color: '#2d6d5c', highlight: '#8ac7b6', accent: '#e2fff6' },
  { id: 'roseglass', label: 'Roseglass', color: '#a54971', highlight: '#eba7c2', accent: '#ffe6f1' },
] as const

export type LetterWaxSealId = (typeof LETTER_WAX_SEALS)[number]['id']

export const LETTER_ENVELOPE_LININGS = [
  { id: 'starlace', label: 'Starlace', desc: 'Midnight navy with scattered gold stars.' },
  { id: 'roseglass', label: 'Roseglass', desc: 'Soft blush folds with a stained-glass glow.' },
  { id: 'tidepool', label: 'Tidepool', desc: 'Sea-glass teal with moonlit ripples.' },
  { id: 'vellum', label: 'Vellum Bloom', desc: 'Ivory lining with faint floral tracery.' },
  { id: 'emberfoil', label: 'Emberfoil', desc: 'Warm bronze lining touched by firelight.' },
] as const

export type LetterEnvelopeLiningId = (typeof LETTER_ENVELOPE_LININGS)[number]['id']

export const HUB_RELICS = [
  { id: 'silver-key', label: 'Silver Key', icon: '🗝' },
  { id: 'pressed-flower', label: 'Pressed Flower', icon: '❀' },
  { id: 'moon-lantern', label: 'Moon Lantern', icon: '🏮' },
  { id: 'pearl-shell', label: 'Pearl Shell', icon: '◌' },
  { id: 'glass-vial', label: 'Glass Vial', icon: '⚗' },
  { id: 'star-map', label: 'Star Map', icon: '✦' },
  { id: 'old-watch', label: 'Old Watch', icon: '◷' },
  { id: 'velvet-ribbon', label: 'Velvet Ribbon', icon: '➰' },
  { id: 'feather-quill', label: 'Feather Quill', icon: '✒' },
  { id: 'sea-stone', label: 'Sea Stone', icon: '◍' },
  { id: 'tiny-bell', label: 'Tiny Bell', icon: '🔔' },
  { id: 'mirror-shard', label: 'Mirror Shard', icon: '◇' },
] as const

export type HubRelicId = (typeof HUB_RELICS)[number]['id']

export type ConstellationHub = {
  id: string
  name: string
}

export type UniversePrompt = {
  id: string
  title: string
  prompt: string
  subject: string
  bodyStarter: string
}

export type SeasonalUniverseMood = {
  id: 'storm-season' | 'blossom-season' | 'solstice' | 'harvest-night' | 'winterlight'
  label: string
  desc: string
  tint: string
  atmosphere: string
}

export const UNIVERSE_PROMPTS: UniversePrompt[] = [
  {
    id: 'lantern-window',
    title: 'Lantern Window',
    prompt: 'Write to the universe about the light you still leave burning for someone.',
    subject: 'For the light I still leave on',
    bodyStarter: 'Tonight I am writing from the window I still keep lit. ',
  },
  {
    id: 'unfinished-prayer',
    title: 'Unfinished Prayer',
    prompt: 'Write the thing you never said because you thought silence would be kinder.',
    subject: 'Something silence kept',
    bodyStarter: 'There is something I left in silence because I thought it would hurt less there. ',
  },
  {
    id: 'small-return',
    title: 'Small Return',
    prompt: 'Tell the universe about a piece of yourself that has quietly come back.',
    subject: 'A small return',
    bodyStarter: 'Lately, a small lost part of me has been finding its way back. ',
  },
  {
    id: 'weather-memory',
    title: 'Weather Memory',
    prompt: 'Describe a memory that still arrives with its own weather.',
    subject: 'The weather of one memory',
    bodyStarter: 'Some memories do not return as scenes. They return as weather. ',
  },
  {
    id: 'stranger-thankyou',
    title: 'Stranger Thank You',
    prompt: 'Write gratitude to a stranger you will probably never meet again.',
    subject: 'For the stranger who stayed with me',
    bodyStarter: 'I do not know your name anymore, but some part of me still remembers your kindness. ',
  },
  {
    id: 'future-threshold',
    title: 'Future Threshold',
    prompt: 'Tell the universe what kind of life you are quietly trying to walk toward.',
    subject: 'Toward the life I am trying to reach',
    bodyStarter: 'I am not there yet, but I think I can feel the shape of the life I am walking toward. ',
  },
]

const HUB_RELICS_STORAGE_PREFIX = 'dear-stranger:hub-relics:'
const CONSTELLATION_HUBS_STORAGE_PREFIX = 'dear-stranger:constellations:'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function sanitizeHubRelics(relicIds: readonly string[]) {
  return relicIds
    .filter((id): id is HubRelicId => HUB_RELICS.some((relic) => relic.id === id))
    .slice(0, 3)
}

export function sanitizeConstellationHubs(hubs: Array<{ id?: string; name?: string }>) {
  return hubs
    .filter((hub): hub is ConstellationHub => Boolean(hub?.id && hub?.name?.trim()))
    .slice(0, 12)
}

type LetterMetadataKey = 'RITUAL' | 'WAX' | 'LINING'

type LetterMetadataShape = {
  ritualId?: LetterRitualId
  waxSealId?: LetterWaxSealId
  liningId?: LetterEnvelopeLiningId
}

function subjectMarker(key: LetterMetadataKey, value: string) {
  return `⟦${key}:${value}⟧`
}

export function encodeLetterSubject(
  subject: string,
  metadata: LetterMetadataShape = {},
) {
  const trimmedSubject = subject.trim()
  const markers = [
    metadata.ritualId ? subjectMarker('RITUAL', metadata.ritualId) : null,
    metadata.waxSealId ? subjectMarker('WAX', metadata.waxSealId) : null,
    metadata.liningId ? subjectMarker('LINING', metadata.liningId) : null,
  ].filter(Boolean)

  if (markers.length === 0) return trimmedSubject
  return `${markers.join(' ')} ${trimmedSubject}`
}

export function parseLetterSubject(subject?: string | null) {
  let remainingSubject = (subject || '').trim()
  let ritualId: LetterRitualId | undefined
  let waxSealId: LetterWaxSealId | undefined
  let liningId: LetterEnvelopeLiningId | undefined

  while (remainingSubject.startsWith('⟦')) {
    const match = remainingSubject.match(/^⟦([A-Z]+):([a-z0-9-]+)⟧\s*/)
    if (!match) break

    const [, key, value] = match

    if (key === 'RITUAL') {
      ritualId = LETTER_RITUALS.find((item) => item.id === value)?.id
    }

    if (key === 'WAX') {
      waxSealId = LETTER_WAX_SEALS.find((item) => item.id === value)?.id
    }

    if (key === 'LINING') {
      liningId = LETTER_ENVELOPE_LININGS.find((item) => item.id === value)?.id
    }

    remainingSubject = remainingSubject.slice(match[0].length).trimStart()
  }

  return {
    ritualId,
    waxSealId,
    liningId,
    subject: remainingSubject.trim() || 'A letter for you',
  }
}

export function loadHubRelics(storageScope?: string) {
  if (!storageScope || !canUseStorage()) return [] as HubRelicId[]

  try {
    const raw = window.localStorage.getItem(`${HUB_RELICS_STORAGE_PREFIX}${storageScope}`)
    if (!raw) return []

    const parsed = JSON.parse(raw) as string[]
    return parsed
      .filter((id): id is HubRelicId => HUB_RELICS.some((relic) => relic.id === id))
      .slice(0, 3)
  } catch {
    return []
  }
}

export function saveHubRelics(storageScope: string, relicIds: HubRelicId[]) {
  if (!storageScope || !canUseStorage()) return

  const cleaned = sanitizeHubRelics(relicIds)

  window.localStorage.setItem(
    `${HUB_RELICS_STORAGE_PREFIX}${storageScope}`,
    JSON.stringify(cleaned),
  )
}

export function loadConstellationHubs(storageScope?: string) {
  if (!storageScope || !canUseStorage()) return [] as ConstellationHub[]

  try {
    const raw = window.localStorage.getItem(`${CONSTELLATION_HUBS_STORAGE_PREFIX}${storageScope}`)
    if (!raw) return []

    const parsed = JSON.parse(raw) as Array<{ id?: string; name?: string }>

    return parsed
      .filter((hub): hub is ConstellationHub => Boolean(hub?.id && hub?.name))
      .slice(0, 12)
  } catch {
    return []
  }
}

export function saveConstellationHubs(storageScope: string, hubs: ConstellationHub[]) {
  if (!storageScope || !canUseStorage()) return

  const cleaned = sanitizeConstellationHubs(hubs)

  window.localStorage.setItem(
    `${CONSTELLATION_HUBS_STORAGE_PREFIX}${storageScope}`,
    JSON.stringify(cleaned),
  )
}

export function getSeasonalUniverseMood(date = new Date()): SeasonalUniverseMood {
  const month = date.getMonth()

  if (month >= 2 && month <= 4) {
    return {
      id: 'blossom-season',
      label: 'Blossom Season',
      desc: 'The map is full of tender returns, thawing color, and soft bright edges.',
      tint: 'radial-gradient(ellipse 60% 48% at 18% 22%, rgba(225,145,176,0.2) 0%, transparent 65%), radial-gradient(ellipse 55% 46% at 84% 78%, rgba(120,168,234,0.14) 0%, transparent 65%)',
      atmosphere: 'Petal-bright letters drift more lightly through the dark.',
    }
  }

  if (month >= 5 && month <= 7) {
    return {
      id: 'solstice',
      label: 'Solstice',
      desc: 'Long light pools at the horizon and the universe feels briefly more open.',
      tint: 'radial-gradient(ellipse 62% 44% at 50% 18%, rgba(232,184,90,0.2) 0%, transparent 65%), radial-gradient(ellipse 40% 40% at 12% 80%, rgba(115,165,255,0.12) 0%, transparent 65%)',
      atmosphere: 'Gold-lit distances make every crossing feel a little possible.',
    }
  }

  if (month >= 8 && month <= 9) {
    return {
      id: 'harvest-night',
      label: 'Harvest Night',
      desc: 'Copper dusk gathers around the map and old feelings come nearer to the surface.',
      tint: 'radial-gradient(ellipse 55% 42% at 82% 24%, rgba(212,122,74,0.18) 0%, transparent 65%), radial-gradient(ellipse 48% 42% at 18% 78%, rgba(148,103,54,0.12) 0%, transparent 65%)',
      atmosphere: 'The universe carries warmer embers and deeper shadows.',
    }
  }

  if (month >= 10 || month <= 0) {
    return {
      id: 'winterlight',
      label: 'Winterlight',
      desc: 'The sky quiets into silver-blue hush and every glow feels more deliberate.',
      tint: 'radial-gradient(ellipse 58% 44% at 16% 24%, rgba(154,176,246,0.16) 0%, transparent 65%), radial-gradient(ellipse 45% 40% at 80% 76%, rgba(212,225,255,0.12) 0%, transparent 65%)',
      atmosphere: 'Letters travel through a colder hush with steadier light.',
    }
  }

  return {
    id: 'storm-season',
    label: 'Storm Season',
    desc: 'Violet weather rolls through the dark and the map feels charged with weathered feeling.',
    tint: 'radial-gradient(ellipse 60% 46% at 20% 26%, rgba(86,64,170,0.22) 0%, transparent 65%), radial-gradient(ellipse 44% 40% at 82% 72%, rgba(32,80,150,0.14) 0%, transparent 65%)',
    atmosphere: 'The universe hums with thunder-soft electricity.',
  }
}
