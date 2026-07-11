import { z } from "zod";
import {
  DataforseoLabsDomainRankOverviewLiveItem,
  DataforseoLabsMetricsInfo,
  DataforseoLabsRelatedKeywordsLiveItem,
  DataforseoLabsRelevantPagesLiveItem,
  DataforseoLabsSerpCompetitorsLiveItem,
  KeywordDataInfo,
  KeywordInfo,
  KeywordProperties,
  MonthlySearchesInfo,
  SearchIntentInfo,
  type DataforseoLabsGoogleKeywordOverviewLiveItem,
} from "dataforseo-client";
import type { DataforseoApiResponse } from "@/server/lib/dataforseo/envelope";
import {
  hashSeed,
  pick,
  randFloat,
  randInt,
  seededRandom,
} from "@/server/lib/dataforseo/mock/random";

// SDK item models are 1:1 supersets of what we need, so we expose them directly
// under the names the rest of the app already uses (no hand-written Zod).
export type LabsKeywordDataItem = KeywordDataInfo;
type RelatedKeywordItem = DataforseoLabsRelatedKeywordsLiveItem;
type DomainMetricsItem = DataforseoLabsDomainRankOverviewLiveItem;
export type RelevantPagesItem = DataforseoLabsRelevantPagesLiveItem;
export type KeywordOverviewItem = DataforseoLabsGoogleKeywordOverviewLiveItem;
type SerpCompetitorItem = DataforseoLabsSerpCompetitorsLiveItem;

const domainRankedKeywordItemSchema = z
  .object({
    keyword_data: z
      .object({
        keyword: z.string().nullable().optional(),
        keyword_info: z
          .object({
            search_volume: z.number().nullable().optional(),
            cpc: z.number().nullable().optional(),
            keyword_difficulty: z.number().nullable().optional(),
          })
          .passthrough()
          .nullable()
          .optional(),
        keyword_properties: z
          .object({
            keyword_difficulty: z.number().nullable().optional(),
          })
          .passthrough()
          .nullable()
          .optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    ranked_serp_element: z
      .object({
        serp_item: z
          .object({
            url: z.string().nullable().optional(),
            relative_url: z.string().nullable().optional(),
            rank_absolute: z.number().nullable().optional(),
            etv: z.number().nullable().optional(),
          })
          .passthrough()
          .nullable()
          .optional(),
        url: z.string().nullable().optional(),
        relative_url: z.string().nullable().optional(),
        rank_absolute: z.number().nullable().optional(),
        etv: z.number().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    keyword: z.string().nullable().optional(),
  })
  .passthrough();

export type DomainRankedKeywordItem = z.infer<
  typeof domainRankedKeywordItemSchema
>;

type DataforseoLabsItemType =
  | "organic"
  | "paid"
  | "featured_snippet"
  | "local_pack"
  | "ai_overview_reference";

function billingPath(...segments: string[]) {
  return ["v3", "dataforseo_labs", "google", ...segments];
}

const INTENTS = [
  "informational",
  "navigational",
  "commercial",
  "transactional",
];

function monthlySearches(rand: () => number, baseVolume: number) {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const wobble = randFloat(rand, 0.75, 1.25, 2);
    return new MonthlySearchesInfo({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      search_volume: Math.max(0, Math.round(baseVolume * wobble)),
    });
  });
}

function fakeKeywordInfo(keyword: string): KeywordDataInfo {
  const rand = seededRandom(hashSeed(keyword));
  const searchVolume = randInt(rand, 10, 40_000);
  return new KeywordDataInfo({
    keyword,
    keyword_info: new KeywordInfo({
      search_volume: searchVolume,
      cpc: randFloat(rand, 0.1, 12, 2),
      competition: randFloat(rand, 0, 1, 2),
      competition_level: pick(rand, ["LOW", "MEDIUM", "HIGH"]),
      monthly_searches: monthlySearches(rand, searchVolume),
    }),
    keyword_properties: new KeywordProperties({
      keyword_difficulty: randInt(rand, 1, 100),
      words_count: keyword.split(/\s+/).length,
    }),
    search_intent_info: new SearchIntentInfo({
      main_intent: pick(rand, INTENTS),
    }),
  });
}

export async function fetchRelatedKeywords(input: {
  keyword: string;
  locationCode: number;
  languageCode: string;
  limit: number;
  depth?: number;
  includeClickstreamData?: boolean;
}): Promise<DataforseoApiResponse<RelatedKeywordItem[]>> {
  const rand = seededRandom(hashSeed(input.keyword, input.locationCode));
  const modifiers = [
    "best",
    "cheap",
    "near me",
    "for beginners",
    "vs",
    "how to",
    "guide",
    "tips",
    "review",
    "alternatives",
  ];
  const count = Math.max(0, Math.min(input.limit, modifiers.length));
  const data: RelatedKeywordItem[] = Array.from({ length: count }, (_, i) => {
    const phrase =
      rand() > 0.5
        ? `${modifiers[i]} ${input.keyword}`
        : `${input.keyword} ${modifiers[i]}`;
    return new DataforseoLabsRelatedKeywordsLiveItem({
      keyword_data: fakeKeywordInfo(phrase),
      depth: input.depth ?? 3,
      related_keywords: [],
    });
  });
  return {
    data,
    billing: { path: billingPath("related_keywords", "live"), costUsd: 0 },
  };
}

export async function fetchKeywordSuggestions(input: {
  keyword: string;
  locationCode: number;
  languageCode: string;
  limit: number;
  includeClickstreamData?: boolean;
}): Promise<DataforseoApiResponse<LabsKeywordDataItem[]>> {
  const suffixes = [
    "online",
    "service",
    "software",
    "app",
    "tool",
    "company",
    "near me",
    "cost",
    "pricing",
    "free",
  ];
  const count = Math.max(0, Math.min(input.limit, suffixes.length));
  const data = Array.from({ length: count }, (_, i) =>
    fakeKeywordInfo(`${input.keyword} ${suffixes[i]}`),
  );
  return {
    data,
    billing: { path: billingPath("keyword_suggestions", "live"), costUsd: 0 },
  };
}

export async function fetchKeywordIdeas(input: {
  keyword: string;
  locationCode: number;
  languageCode: string;
  limit: number;
  includeClickstreamData?: boolean;
}): Promise<DataforseoApiResponse<LabsKeywordDataItem[]>> {
  const prefixes = [
    "best",
    "top",
    "affordable",
    "professional",
    "local",
    "diy",
    "commercial",
    "residential",
  ];
  const count = Math.max(0, Math.min(input.limit, prefixes.length));
  const data = Array.from({ length: count }, (_, i) =>
    fakeKeywordInfo(`${prefixes[i]} ${input.keyword}`),
  );
  return {
    data,
    billing: { path: billingPath("keyword_ideas", "live"), costUsd: 0 },
  };
}

export async function fetchDomainRankOverview(input: {
  target: string;
  locationCode: number;
  languageCode: string;
}): Promise<DataforseoApiResponse<DomainMetricsItem[]>> {
  const rand = seededRandom(hashSeed(input.target, input.locationCode));
  const organicCount = randInt(rand, 5, 5000);
  const item = new DataforseoLabsDomainRankOverviewLiveItem({
    location_code: input.locationCode,
    language_code: input.languageCode,
    metrics: {
      organic: new DataforseoLabsMetricsInfo({
        etv: randFloat(rand, organicCount * 0.5, organicCount * 8, 1),
        count: organicCount,
        estimated_paid_traffic_cost: randFloat(rand, 100, 50_000, 2),
      }),
      paid: new DataforseoLabsMetricsInfo({
        etv: randFloat(rand, 0, organicCount * 0.5, 1),
        count: randInt(rand, 0, Math.floor(organicCount * 0.2)),
      }),
    },
  });
  return {
    data: [item],
    billing: { path: billingPath("domain_rank_overview", "live"), costUsd: 0 },
  };
}

type RankedKeywordsPage = {
  items: DomainRankedKeywordItem[];
  totalCount: number | null;
};

function fakeRankedKeyword(
  seed: number,
  target: string,
): DomainRankedKeywordItem {
  const rand = seededRandom(seed);
  const keyword = `${target.split(".")[0]} ${pick(rand, ["review", "pricing", "login", "alternatives", "guide", "support"])}`;
  const searchVolume = randInt(rand, 10, 20_000);
  return {
    keyword,
    keyword_data: {
      keyword,
      keyword_info: {
        search_volume: searchVolume,
        cpc: randFloat(rand, 0.1, 10, 2),
        keyword_difficulty: randInt(rand, 1, 100),
      },
      keyword_properties: { keyword_difficulty: randInt(rand, 1, 100) },
    },
    ranked_serp_element: {
      serp_item: {
        url: `https://${target}/${keyword.replace(/\s+/g, "-")}`,
        relative_url: `/${keyword.replace(/\s+/g, "-")}`,
        rank_absolute: randInt(rand, 1, 100),
        etv: randFloat(rand, 1, searchVolume * 0.3, 1),
      },
    },
  };
}

export async function fetchRankedKeywords(input: {
  target: string;
  locationCode: number;
  languageCode: string;
  limit: number;
  offset?: number;
  orderBy?: string[];
  filters?: unknown[];
  itemTypes?: DataforseoLabsItemType[];
  includeSubdomains?: boolean;
}): Promise<DataforseoApiResponse<RankedKeywordsPage>> {
  const total = 180;
  const start = Math.max(0, input.offset ?? 0);
  const end = Math.min(total, start + input.limit);
  const baseSeed = hashSeed(input.target, "ranked-keywords");
  const items = Array.from({ length: Math.max(0, end - start) }, (_, i) =>
    fakeRankedKeyword(baseSeed + start + i, input.target),
  );
  return {
    data: { items, totalCount: total },
    billing: { path: billingPath("ranked_keywords", "live"), costUsd: 0 },
  };
}

type RelevantPagesPage = {
  items: RelevantPagesItem[];
  totalCount: number | null;
};

const RELEVANT_PAGE_SLUGS = [
  "/",
  "/blog",
  "/pricing",
  "/features",
  "/docs",
  "/about",
  "/contact",
  "/blog/guide",
];

function fakeRelevantPage(seed: number, target: string): RelevantPagesItem {
  const rand = seededRandom(seed);
  const slug = pick(rand, RELEVANT_PAGE_SLUGS);
  const organicCount = randInt(rand, 1, 400);
  return new DataforseoLabsRelevantPagesLiveItem({
    page_address: `https://${target}${slug}`,
    metrics: {
      organic: new DataforseoLabsMetricsInfo({
        etv: randFloat(rand, organicCount * 0.5, organicCount * 5, 1),
        count: organicCount,
      }),
    },
  });
}

export async function fetchRelevantPages(input: {
  target: string;
  locationCode: number;
  languageCode: string;
  limit: number;
  offset?: number;
  orderBy?: string[];
  filters?: unknown[];
}): Promise<DataforseoApiResponse<RelevantPagesPage>> {
  const total = 60;
  const start = Math.max(0, input.offset ?? 0);
  const end = Math.min(total, start + input.limit);
  const baseSeed = hashSeed(input.target, "relevant-pages");
  const items = Array.from({ length: Math.max(0, end - start) }, (_, i) =>
    fakeRelevantPage(baseSeed + start + i, input.target),
  );
  return {
    data: { items, totalCount: total },
    billing: { path: billingPath("relevant_pages", "live"), costUsd: 0 },
  };
}

export async function fetchKeywordOverview(input: {
  keywords: string[];
  locationCode: number;
  languageCode: string;
  includeClickstreamData?: boolean;
}): Promise<DataforseoApiResponse<KeywordOverviewItem[]>> {
  const data = input.keywords.map((keyword) => fakeKeywordInfo(keyword));
  return {
    data,
    billing: { path: billingPath("keyword_overview", "live"), costUsd: 0 },
  };
}

function fakeSerpCompetitor(seed: number): SerpCompetitorItem {
  const rand = seededRandom(seed);
  const keywordsCount = randInt(rand, 5, 5000);
  return new DataforseoLabsSerpCompetitorsLiveItem({
    domain: `${pick(rand, ["competitorone", "rivaltwo", "marketleader", "industryhub", "topbrand"])}${randInt(rand, 1, 99)}.example`,
    avg_position: randFloat(rand, 1, 50, 1),
    median_position: randFloat(rand, 1, 50, 1),
    rating: randFloat(rand, 0, 1, 2),
    etv: randFloat(rand, keywordsCount * 0.3, keywordsCount * 6, 1),
    keywords_count: keywordsCount,
    visibility: randFloat(rand, 0, 1, 3),
    relevant_serp_items: randInt(rand, 1, keywordsCount),
  });
}

export async function fetchSerpCompetitors(input: {
  keywords: string[];
  locationCode: number;
  languageCode: string;
  itemTypes?: DataforseoLabsItemType[];
  includeSubdomains?: boolean;
  limit: number;
  offset?: number;
}): Promise<DataforseoApiResponse<SerpCompetitorItem[]>> {
  const total = Math.min(input.limit, 20);
  const baseSeed = hashSeed(input.keywords.join(","), "serp-competitors");
  const data = Array.from({ length: total }, (_, i) =>
    fakeSerpCompetitor(baseSeed + i),
  );
  return {
    data,
    billing: { path: billingPath("serp_competitors", "live"), costUsd: 0 },
  };
}
