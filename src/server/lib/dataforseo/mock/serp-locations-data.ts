import { formatLocationLabel } from "@/shared/keyword-locations";
import type { SerpLocationResult } from "@/server/lib/dataforseo/serp-locations";

// Curated fallback in place of DataForSEO's full geotarget database (which
// covers ~10k+ sub-country locations per major country). Deliberately small
// — major cities/regions for a handful of countries, not a full replacement.
// Countries outside this list simply return no results, same as a real
// "no results" response.
const RAW_LOCATIONS: Record<
  string,
  { code: number; name: string; type: string }[]
> = {
  us: [
    { code: 1023191, name: "New York,New York,United States", type: "City" },
    {
      code: 1023111,
      name: "Los Angeles,California,United States",
      type: "City",
    },
    { code: 1016367, name: "Chicago,Illinois,United States", type: "City" },
    { code: 1026201, name: "Houston,Texas,United States", type: "City" },
    { code: 1026339, name: "Phoenix,Arizona,United States", type: "City" },
    {
      code: 1023510,
      name: "San Francisco,California,United States",
      type: "City",
    },
    { code: 1026481, name: "Seattle,Washington,United States", type: "City" },
    { code: 1014044, name: "Miami,Florida,United States", type: "City" },
  ],
  gb: [
    { code: 1006886, name: "London,England,United Kingdom", type: "City" },
    { code: 1006697, name: "Manchester,England,United Kingdom", type: "City" },
    { code: 1006554, name: "Birmingham,England,United Kingdom", type: "City" },
    { code: 1006944, name: "Edinburgh,Scotland,United Kingdom", type: "City" },
  ],
  ca: [
    { code: 1002573, name: "Toronto,Ontario,Canada", type: "City" },
    { code: 1002338, name: "Vancouver,British Columbia,Canada", type: "City" },
    { code: 1002423, name: "Montreal,Quebec,Canada", type: "City" },
    { code: 1002119, name: "Calgary,Alberta,Canada", type: "City" },
  ],
  au: [
    { code: 1000876, name: "Sydney,New South Wales,Australia", type: "City" },
    { code: 1000658, name: "Melbourne,Victoria,Australia", type: "City" },
    { code: 1000454, name: "Brisbane,Queensland,Australia", type: "City" },
    { code: 1000966, name: "Perth,Western Australia,Australia", type: "City" },
  ],
  de: [
    { code: 1004442, name: "Berlin,Berlin,Germany", type: "City" },
    { code: 1004628, name: "Munich,Bavaria,Germany", type: "City" },
    { code: 1004531, name: "Hamburg,Hamburg,Germany", type: "City" },
    { code: 1004389, name: "Frankfurt,Hesse,Germany", type: "City" },
  ],
  fr: [
    { code: 1005831, name: "Paris,Ile-de-France,France", type: "City" },
    { code: 1005699, name: "Lyon,Auvergne-Rhone-Alpes,France", type: "City" },
    {
      code: 1005612,
      name: "Marseille,Provence-Alpes-Cote d'Azur,France",
      type: "City",
    },
  ],
  es: [
    { code: 1005903, name: "Madrid,Madrid,Spain", type: "City" },
    { code: 1005914, name: "Barcelona,Catalonia,Spain", type: "City" },
    { code: 1005944, name: "Valencia,Valencia,Spain", type: "City" },
  ],
  it: [
    { code: 1008830, name: "Rome,Lazio,Italy", type: "City" },
    { code: 1008847, name: "Milan,Lombardy,Italy", type: "City" },
    { code: 1008818, name: "Naples,Campania,Italy", type: "City" },
  ],
  nl: [
    {
      code: 1010726,
      name: "Amsterdam,North Holland,Netherlands",
      type: "City",
    },
    {
      code: 1010734,
      name: "Rotterdam,South Holland,Netherlands",
      type: "City",
    },
  ],
  in: [
    { code: 1007854, name: "Mumbai,Maharashtra,India", type: "City" },
    { code: 1007801, name: "Delhi,Delhi,India", type: "City" },
    { code: 1007871, name: "Bangalore,Karnataka,India", type: "City" },
  ],
  br: [
    { code: 1001967, name: "Sao Paulo,Sao Paulo,Brazil", type: "City" },
    {
      code: 1001873,
      name: "Rio de Janeiro,Rio de Janeiro,Brazil",
      type: "City",
    },
  ],
  jp: [
    { code: 1009308, name: "Tokyo,Tokyo,Japan", type: "City" },
    { code: 1009359, name: "Osaka,Osaka,Japan", type: "City" },
  ],
};

const LOCATIONS_BY_COUNTRY: Record<string, SerpLocationResult[]> =
  Object.fromEntries(
    Object.entries(RAW_LOCATIONS).map(([iso, locations]) => [
      iso,
      locations.map((location) => ({
        locationCode: location.code,
        locationName: location.name,
        locationType: location.type,
        displayLabel: formatLocationLabel(location.name),
      })),
    ]),
  );

export function getMockLocationsForCountry(
  countryCode: string,
): SerpLocationResult[] {
  return LOCATIONS_BY_COUNTRY[countryCode.toLowerCase()] ?? [];
}
