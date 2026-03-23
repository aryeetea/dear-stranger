export const LETTER_PAGE_BREAK = '\n\n[DEAR_STRANGER_PAGE_BREAK]\n\n'

export const LETTER_FONTS = [
  { id: 'cormorant', label: 'Cormorant', family: "'Cormorant Garamond', serif", preview: 'A letter across the stars' },
  { id: 'im-fell', label: 'IM Fell', family: "'IM Fell English', serif", preview: 'A letter across the stars' },
  { id: 'baskervville', label: 'Baskervville', family: "'Baskervville', serif", preview: 'A letter across the stars' },
  { id: 'bellefair', label: 'Bellefair', family: "'Bellefair', serif", preview: 'A letter across the stars' },
  { id: 'marcellus', label: 'Marcellus', family: "'Marcellus', serif", preview: 'A letter across the stars' },
  { id: 'unna', label: 'Unna', family: "'Unna', serif", preview: 'A letter across the stars' },
  { id: 'cinzel', label: 'Cinzel', family: "'Cinzel', serif", preview: 'A LETTER ACROSS THE STARS' },
  { id: 'cormorant-unicase', label: 'Cormorant Unicase', family: "'Cormorant Unicase', serif", preview: 'A letter across the stars' },
  { id: 'petit-formal', label: 'Petit Formal', family: "'Petit Formal Script', cursive", preview: 'A letter across the stars' },
  { id: 'italiana', label: 'Italiana', family: "'Italiana', serif", preview: 'A letter across the stars' },
  { id: 'dancing', label: 'Dancing Script', family: "'Dancing Script', cursive", preview: 'A letter across the stars' },
  { id: 'parisienne', label: 'Parisienne', family: "'Parisienne', cursive", preview: 'A dreamy letter across the stars' },
  { id: 'allura', label: 'Allura', family: "'Allura', cursive", preview: 'A dreamy letter across the stars' },
  { id: 'sacramento', label: 'Sacramento', family: "'Sacramento', cursive", preview: 'A dreamy letter across the stars' },
  { id: 'style-script', label: 'Style Script', family: "'Style Script', cursive", preview: 'A dreamy letter across the stars' },
  { id: 'special-elite', label: 'Special Elite', family: "'Special Elite', cursive", preview: 'A letter across the stars' },
] as const

export type LetterFont = (typeof LETTER_FONTS)[number]

export const LETTER_FONT_FAMILIES = Object.fromEntries(
  LETTER_FONTS.map((font) => [font.id, font.family]),
) as Record<string, string>

export function splitLetterPages(body?: string | null) {
  if (!body?.trim()) return ['']

  const pages = body
    .split(LETTER_PAGE_BREAK)
    .map((page) => page.trim())
    .filter(Boolean)

  return pages.length > 0 ? pages : [body.trim()]
}

export function joinLetterPages(pages: string[]) {
  const normalizedPages = pages
    .map((page) => page.trim())
    .filter(Boolean)

  return normalizedPages.join(LETTER_PAGE_BREAK)
}

export function getLetterPreview(body?: string | null, maxLength = 120) {
  const text = splitLetterPages(body)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!text) return ''
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

export function getLetterPageCount(body?: string | null) {
  return splitLetterPages(body).filter((page) => page.trim()).length || 1
}
