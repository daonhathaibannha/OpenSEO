import { getMockLocationsForCountry } from "@/server/lib/dataforseo/mock/serp-locations-data";

export interface SerpLocationResult {
  locationCode: number;
  locationName: string;
  locationType: string;
  displayLabel: string;
}

/**
 * Full sub-country location list for one country. `countryCode` is ISO
 * 3166-1 alpha-2 ("us", "gb"). Backed by a small curated static dataset (see
 * `mock/serp-locations-data.ts`) rather than DataForSEO's full geotarget
 * database — countries outside that curated list return no results, same as
 * a real "no results" response.
 */
export async function fetchSerpLocationsForCountry(
  countryCode: string,
): Promise<SerpLocationResult[]> {
  return getMockLocationsForCountry(countryCode);
}
