/**
 * Shared place-of-birth validation.
 *
 * Required format: City, State/Region, Country — three comma-separated parts.
 *
 * The state/region segment is mandatory (not just for federations like the US
 * or India). The proxy's geocoder + Prokerala's astrology engine produce
 * notably more accurate latitude/longitude resolution when the user supplies
 * a region in addition to city + country, especially in countries with
 * multiple cities sharing a name. Even single-region countries (e.g. Singapore,
 * Vatican) accept the same value repeated for the region slot.
 *
 * Examples:
 *   Faridabad, Haryana, India
 *   New York, New York, USA
 *   Columbus, Ohio, USA
 *   London, England, UK
 *   Singapore, Singapore, Singapore
 *   São Paulo, São Paulo, Brazil
 *   Tokyo, Tokyo, Japan
 */

const PLACE_PART_RE = /^[\p{L}\s\.\-']+$/u;

export const PLACE_FORMAT_EXAMPLES =
  'Faridabad, Haryana, India · Columbus, Ohio, USA · London, England, UK';

export type PlaceValidation = { ok: true } | { ok: false; message: string };

export function validatePlace(raw: string): PlaceValidation {
  const trimmed = raw.trim();

  if (!trimmed) {
    return {
      ok: false,
      message:
        `Please enter your place of birth as City, State, Country — three parts separated by commas.\n\nExamples: ${PLACE_FORMAT_EXAMPLES}`,
    };
  }

  const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);

  if (parts.length < 3) {
    return {
      ok: false,
      message:
        `Please include all three parts — City, State, Country — separated by commas.\n\nExamples: ${PLACE_FORMAT_EXAMPLES}`,
    };
  }

  if (parts.length > 4) {
    return {
      ok: false,
      message:
        `That looks too long. Use just City, State, Country.\n\nExamples: ${PLACE_FORMAT_EXAMPLES}`,
    };
  }

  for (const p of parts) {
    if (p.length < 2 || !PLACE_PART_RE.test(p)) {
      return {
        ok: false,
        message:
          `Each part should be at least 2 letters and contain only letters, spaces, dots, hyphens, or apostrophes.\n\nExamples: ${PLACE_FORMAT_EXAMPLES}`,
      };
    }
  }

  return { ok: true };
}
