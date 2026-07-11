import {
  KeywordsDataGoogleAdsSearchVolumeLiveResultInfo,
  MonthlySearchesInfo,
  type KeywordsDataGoogleAdsKeywordsForKeywordsLiveResultInfo,
} from "dataforseo-client";
import type { DataforseoApiResponse } from "@/server/lib/dataforseo/envelope";
import {
  hashSeed,
  pick,
  randFloat,
  randInt,
  seededRandom,
} from "@/server/lib/dataforseo/mock/random";

// Google Ads keyword data for countries DataForSEO Labs doesn't cover (see
// specs/0004-keyword-data-source-routing.md). Flat-priced per request; items
// carry volume / CPC / competition but no keyword difficulty or intent.
export type AdsKeywordItem = KeywordsDataGoogleAdsSearchVolumeLiveResultInfo;
export type AdsKeywordIdeaItem =
  KeywordsDataGoogleAdsKeywordsForKeywordsLiveResultInfo;

function billingPath(...segments: string[]) {
  return ["v3", "keywords_data", "google_ads", ...segments];
}

function fakeAdsMonthlySearches(rand: () => number, baseVolume: number) {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return new MonthlySearchesInfo({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      search_volume: Math.max(
        0,
        Math.round(baseVolume * randFloat(rand, 0.75, 1.25, 2)),
      ),
    });
  });
}

function fakeAdsKeyword(
  keyword: string,
  locationCode: number,
  languageCode: string,
): AdsKeywordItem {
  const rand = seededRandom(hashSeed(keyword, locationCode, languageCode));
  const searchVolume = randInt(rand, 10, 30_000);
  return new KeywordsDataGoogleAdsSearchVolumeLiveResultInfo({
    keyword,
    location_code: locationCode,
    language_code: languageCode,
    competition: pick(rand, ["LOW", "MEDIUM", "HIGH"]),
    competition_index: randInt(rand, 0, 100),
    search_volume: searchVolume,
    low_top_of_page_bid: randFloat(rand, 0.1, 3, 2),
    high_top_of_page_bid: randFloat(rand, 3, 15, 2),
    cpc: randFloat(rand, 0.1, 10, 2),
    monthly_searches: fakeAdsMonthlySearches(rand, searchVolume),
  });
}

export async function fetchAdsSearchVolume(input: {
  keywords: string[];
  locationCode: number;
  languageCode: string;
  locationName?: string;
}): Promise<DataforseoApiResponse<AdsKeywordItem[]>> {
  const data = input.keywords.map((keyword) =>
    fakeAdsKeyword(keyword, input.locationCode, input.languageCode),
  );
  return {
    data,
    billing: { path: billingPath("search_volume", "live"), costUsd: 0 },
  };
}

export async function fetchAdsKeywordIdeas(input: {
  keyword: string;
  locationCode: number;
  languageCode: string;
  limit: number;
}): Promise<DataforseoApiResponse<AdsKeywordIdeaItem[]>> {
  const variants = [
    "buy",
    "best",
    "cheap",
    "near me",
    "for sale",
    "reviews",
    "vs",
    "how to",
    "cost",
    "diy",
    "professional",
    "local",
  ];
  const count = Math.max(0, Math.min(input.limit, variants.length));
  const data = Array.from({ length: count }, (_, i) =>
    fakeAdsKeyword(
      `${variants[i]} ${input.keyword}`,
      input.locationCode,
      input.languageCode,
    ),
  );
  return {
    data,
    billing: {
      path: billingPath("keywords_for_keywords", "live"),
      costUsd: 0,
    },
  };
}
