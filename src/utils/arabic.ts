/**
 * Arabic text normalization and fuzzy search helpers
 * Replaces:
 * - أ, إ, آ, ء -> ا
 * - ة -> ه
 * - ى -> ي
 * - Removes tashkeel / harakat
 * - Collapses extra whitespace
 */

export function normalizeArabicText(text: string | null | undefined): string {
  if (!text) return '';

  return text
    .toString()
    .trim()
    // Remove Arabic diacritics / tashkeel
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Normalize Alef variations
    .replace(/[أإآء]/g, 'ا')
    // Normalize Taa Marbuta
    .replace(/ة/g, 'ه')
    // Normalize Yaa / Alef Maksura
    .replace(/ى/g, 'ي')
    // Normalize Kashida
    .replace(/\u0640/g, '')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Searches if query is found within target using normalized Arabic comparison
 */
export function arabicSearchMatch(target: string | null | undefined, query: string | null | undefined): boolean {
  if (!query || query.trim() === '') return true;
  if (!target) return false;

  const normalizedTarget = normalizeArabicText(target);
  const normalizedQuery = normalizeArabicText(query);

  const queryWords = normalizedQuery.split(' ').filter(Boolean);
  return queryWords.every(word => normalizedTarget.includes(word));
}
