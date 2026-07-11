import { z } from "zod";
import {
  normalizeBacklinksSpamFilterOptions,
  type BacklinksSpamFilterOptions,
} from "@/types/schemas/backlinks";
import type { DataforseoApiResponse } from "@/server/lib/dataforseo/envelope";
import {
  hashSeed,
  pick,
  randInt,
  seededRandom,
  weightedBool,
} from "@/server/lib/dataforseo/mock/random";

export { normalizeBacklinksTarget } from "@/server/lib/dataforseoBacklinksTarget";

type BacklinksRequest = { target: string };
type BacklinksListRequest = BacklinksRequest &
  BacklinksSpamFilterOptions & {
    limit?: number;
    offset?: number;
    /** DataForSEO order_by entries, e.g. ["rank,desc"]. Not applied to mock data. */
    orderBy?: string[];
    /** Pre-built DataForSEO filter expressions. Not applied to mock data. */
    filters?: unknown[];
    /** Result grouping (backlinks list only): "one_per_domain" | "as_is". */
    mode?: string;
  };
type BacklinksTimeseriesRequest = {
  target: string;
  dateFrom: string;
  dateTo: string;
};

// DataForSEO ships both the misspelled (`*_reffering_*`) and corrected keys; we
// accept both via passthrough so callers can read whichever is present.
export const backlinksSummaryItemSchema = z
  .object({
    target: z.string().optional(),
    rank: z.number().nullable().optional(),
    backlinks: z.number().nullable().optional(),
    referring_pages: z.number().nullable().optional(),
    referring_domains: z.number().nullable().optional(),
    broken_backlinks: z.number().nullable().optional(),
    broken_pages: z.number().nullable().optional(),
    new_backlinks: z.number().nullable().optional(),
    lost_backlinks: z.number().nullable().optional(),
    new_reffering_domains: z.number().nullable().optional(),
    lost_reffering_domains: z.number().nullable().optional(),
    new_referring_domains: z.number().nullable().optional(),
    lost_referring_domains: z.number().nullable().optional(),
    backlinks_spam_score: z.number().nullable().optional(),
    info: z
      .object({ target_spam_score: z.number().nullable().optional() })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

export const backlinksItemSchema = z
  .object({
    domain_from: z.string().nullable().optional(),
    url_from: z.string().nullable().optional(),
    url_to: z.string().nullable().optional(),
    anchor: z.string().nullable().optional(),
    item_type: z.string().nullable().optional(),
    dofollow: z.boolean().nullable().optional(),
    rank: z.number().nullable().optional(),
    domain_from_rank: z.number().nullable().optional(),
    page_from_rank: z.number().nullable().optional(),
    backlinks_spam_score: z.number().nullable().optional(),
    backlink_spam_score: z.number().nullable().optional(),
    first_seen: z.string().nullable().optional(),
    last_visited: z.string().nullable().optional(),
    lost_date: z.string().nullable().optional(),
    is_new: z.boolean().nullable().optional(),
    is_lost: z.boolean().nullable().optional(),
    is_broken: z.boolean().nullable().optional(),
    links_count: z.number().nullable().optional(),
    rel_attributes: z.array(z.string()).nullable().optional(),
    attributes: z.array(z.string()).nullable().optional(),
  })
  .passthrough();

export const referringDomainItemSchema = z
  .object({
    domain: z.string().nullable().optional(),
    backlinks: z.number().nullable().optional(),
    referring_pages: z.number().nullable().optional(),
    rank: z.number().nullable().optional(),
    first_seen: z.string().nullable().optional(),
    broken_backlinks: z.number().nullable().optional(),
    broken_pages: z.number().nullable().optional(),
    backlinks_spam_score: z.number().nullable().optional(),
    target_spam_score: z.number().nullable().optional(),
  })
  .passthrough();

export const domainPageSummaryItemSchema = z
  .object({
    page: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    backlinks: z.number().nullable().optional(),
    referring_domains: z.number().nullable().optional(),
    rank: z.number().nullable().optional(),
    broken_backlinks: z.number().nullable().optional(),
  })
  .passthrough();

export const backlinksHistoryItemSchema = z
  .object({
    date: z.string().nullable().optional(),
    rank: z.number().nullable().optional(),
    backlinks: z.number().nullable().optional(),
    referring_domains: z.number().nullable().optional(),
    new_backlinks: z.number().nullable().optional(),
    lost_backlinks: z.number().nullable().optional(),
    new_reffering_domains: z.number().nullable().optional(),
    lost_reffering_domains: z.number().nullable().optional(),
    new_referring_domains: z.number().nullable().optional(),
    lost_referring_domains: z.number().nullable().optional(),
  })
  .passthrough();

export type BacklinksSummaryItem = z.infer<typeof backlinksSummaryItemSchema>;
export type BacklinksItem = z.infer<typeof backlinksItemSchema>;
export type ReferringDomainItem = z.infer<typeof referringDomainItemSchema>;
export type DomainPageSummaryItem = z.infer<typeof domainPageSummaryItemSchema>;
export type BacklinksHistoryItem = z.infer<typeof backlinksHistoryItemSchema>;

// Stable "universe" size per target so offset/limit slicing looks consistent
// across repeated/paginated calls instead of regenerating a different set.
const MOCK_BACKLINKS_TOTAL = 240;
const MOCK_REFERRING_DOMAINS_TOTAL = 96;
const MOCK_DOMAIN_PAGES_TOTAL = 60;

const REFERRER_DOMAINS = [
  "newsdaily.example",
  "techreview.example",
  "bloggerhub.example",
  "industryinsights.example",
  "localdirectory.example",
  "forumtalk.example",
  "reviewcentral.example",
  "startupwire.example",
  "resourcelist.example",
  "communityboard.example",
];
const ANCHOR_TEXTS = [
  "click here",
  "learn more",
  "official site",
  "read the full guide",
  "this resource",
  "",
];

function billingPath(...segments: string[]) {
  return ["v3", "backlinks", ...segments];
}

export async function fetchBacklinksSummary(
  input: BacklinksRequest,
): Promise<DataforseoApiResponse<BacklinksSummaryItem>> {
  const rand = seededRandom(hashSeed(input.target));
  const backlinks = randInt(rand, 200, 40_000);
  const referringDomains = randInt(rand, 20, Math.floor(backlinks / 8) + 5);
  const data: BacklinksSummaryItem = {
    target: input.target,
    rank: randInt(rand, 10, 95),
    backlinks,
    referring_pages: randInt(rand, referringDomains, backlinks),
    referring_domains: referringDomains,
    broken_backlinks: randInt(rand, 0, Math.floor(backlinks * 0.03)),
    broken_pages: randInt(rand, 0, Math.floor(referringDomains * 0.05)),
    new_backlinks: randInt(rand, 0, 120),
    lost_backlinks: randInt(rand, 0, 80),
    new_referring_domains: randInt(rand, 0, 15),
    lost_referring_domains: randInt(rand, 0, 10),
    backlinks_spam_score: randInt(rand, 1, 35),
    info: { target_spam_score: randInt(rand, 1, 35) },
  };
  return {
    data,
    billing: { path: billingPath("summary", "live"), costUsd: 0 },
  };
}

function fakeBacklinkRow(seed: number): BacklinksItem {
  const rand = seededRandom(seed);
  const domainFrom = pick(rand, REFERRER_DOMAINS);
  const isLost = weightedBool(rand, 0.08);
  return {
    domain_from: domainFrom,
    url_from: `https://${domainFrom}/article-${randInt(rand, 1, 999)}`,
    url_to: "/",
    anchor: pick(rand, ANCHOR_TEXTS),
    item_type: "anchor",
    dofollow: weightedBool(rand, 0.75),
    rank: randInt(rand, 5, 90),
    domain_from_rank: randInt(rand, 5, 90),
    page_from_rank: randInt(rand, 1, 80),
    backlinks_spam_score: randInt(rand, 1, 40),
    first_seen: "2023-06-01 00:00:00 +00:00",
    last_visited: "2026-06-01 00:00:00 +00:00",
    lost_date: isLost ? "2026-05-01 00:00:00 +00:00" : null,
    is_new: weightedBool(rand, 0.1),
    is_lost: isLost,
    is_broken: weightedBool(rand, 0.04),
    links_count: randInt(rand, 1, 3),
    rel_attributes: weightedBool(rand, 0.3) ? ["nofollow"] : [],
    attributes: [],
  };
}

function paginate<T>(
  total: number,
  offset: number | undefined,
  limit: number | undefined,
  build: (index: number) => T,
): { items: T[]; totalCount: number } {
  const start = Math.max(0, offset ?? 0);
  const end = Math.min(total, start + (limit ?? 100));
  const items = Array.from({ length: Math.max(0, end - start) }, (_, i) =>
    build(start + i),
  );
  return { items, totalCount: total };
}

export async function fetchBacklinksRows(
  input: BacklinksListRequest,
): Promise<
  DataforseoApiResponse<{ items: BacklinksItem[]; totalCount: number | null }>
> {
  const spamFilterOptions = normalizeBacklinksSpamFilterOptions(input);
  const baseSeed = hashSeed(input.target, "backlinks");
  let { items, totalCount } = paginate(
    MOCK_BACKLINKS_TOTAL,
    input.offset,
    input.limit,
    (index) => fakeBacklinkRow(baseSeed + index),
  );
  if (spamFilterOptions.hideSpam) {
    const threshold = spamFilterOptions.spamThreshold ?? 100;
    items = items.filter(
      (item) => (item.backlinks_spam_score ?? 0) <= threshold,
    );
  }
  return {
    data: { items, totalCount },
    billing: { path: billingPath("backlinks", "live"), costUsd: 0 },
  };
}

function fakeReferringDomain(seed: number): ReferringDomainItem {
  const rand = seededRandom(seed);
  const backlinks = randInt(rand, 1, 400);
  return {
    domain: `${pick(rand, REFERRER_DOMAINS).split(".")[0]}${randInt(rand, 1, 999)}.example`,
    backlinks,
    referring_pages: randInt(rand, 1, backlinks),
    rank: randInt(rand, 5, 90),
    first_seen: "2023-04-10 00:00:00 +00:00",
    broken_backlinks: randInt(rand, 0, 5),
    broken_pages: randInt(rand, 0, 3),
    backlinks_spam_score: randInt(rand, 1, 40),
    target_spam_score: randInt(rand, 1, 40),
  };
}

export async function fetchReferringDomains(
  input: BacklinksListRequest,
): Promise<
  DataforseoApiResponse<{
    items: ReferringDomainItem[];
    totalCount: number | null;
  }>
> {
  const spamFilterOptions = normalizeBacklinksSpamFilterOptions(input);
  const baseSeed = hashSeed(input.target, "referring-domains");
  let { items, totalCount } = paginate(
    MOCK_REFERRING_DOMAINS_TOTAL,
    input.offset,
    input.limit,
    (index) => fakeReferringDomain(baseSeed + index),
  );
  if (spamFilterOptions.hideSpam) {
    const threshold = spamFilterOptions.spamThreshold ?? 100;
    items = items.filter(
      (item) => (item.backlinks_spam_score ?? 0) <= threshold,
    );
  }
  return {
    data: { items, totalCount },
    billing: { path: billingPath("referring_domains", "live"), costUsd: 0 },
  };
}

const PAGE_SLUGS = [
  "/",
  "/blog/getting-started",
  "/pricing",
  "/features",
  "/about",
  "/blog/best-practices",
  "/docs",
  "/contact",
];

function fakeDomainPage(seed: number, target: string): DomainPageSummaryItem {
  const rand = seededRandom(seed);
  const slug = pick(rand, PAGE_SLUGS);
  return {
    page: slug,
    url: `https://${target.replace(/^https?:\/\//, "").replace(/\/$/, "")}${slug}`,
    backlinks: randInt(rand, 1, 500),
    referring_domains: randInt(rand, 1, 60),
    rank: randInt(rand, 5, 90),
    broken_backlinks: randInt(rand, 0, 4),
  };
}

export async function fetchDomainPagesSummary(
  input: BacklinksListRequest,
): Promise<
  DataforseoApiResponse<{
    items: DomainPageSummaryItem[];
    totalCount: number | null;
  }>
> {
  const baseSeed = hashSeed(input.target, "domain-pages");
  const { items, totalCount } = paginate(
    MOCK_DOMAIN_PAGES_TOTAL,
    input.offset,
    input.limit,
    (index) => fakeDomainPage(baseSeed + index, input.target),
  );
  return {
    data: { items, totalCount },
    billing: { path: billingPath("domain_pages_summary", "live"), costUsd: 0 },
  };
}

export async function fetchBacklinksHistory(
  input: BacklinksTimeseriesRequest,
): Promise<DataforseoApiResponse<BacklinksHistoryItem[]>> {
  const rand = seededRandom(hashSeed(input.target, "history"));
  const from = new Date(input.dateFrom);
  const to = new Date(input.dateTo);
  const days = Math.max(
    1,
    Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)),
  );
  // One point per week (or per day for short ranges) with a slowly-varying
  // trend, not per-point noise, so charts look like a real trendline.
  const stepDays = days > 90 ? 7 : 1;
  let backlinks = randInt(rand, 500, 5000);
  let referringDomains = randInt(rand, 50, 500);
  const data: BacklinksHistoryItem[] = [];
  for (let offset = 0; offset <= days; offset += stepDays) {
    const date = new Date(from.getTime() + offset * 24 * 60 * 60 * 1000);
    const newBacklinks = randInt(rand, 0, 40);
    const lostBacklinks = randInt(rand, 0, 25);
    const newReferringDomains = randInt(rand, 0, 5);
    const lostReferringDomains = randInt(rand, 0, 3);
    backlinks = Math.max(0, backlinks + newBacklinks - lostBacklinks);
    referringDomains = Math.max(
      0,
      referringDomains + newReferringDomains - lostReferringDomains,
    );
    data.push({
      date: date.toISOString().slice(0, 10),
      rank: randInt(rand, 10, 95),
      backlinks,
      referring_domains: referringDomains,
      new_backlinks: newBacklinks,
      lost_backlinks: lostBacklinks,
      new_referring_domains: newReferringDomains,
      lost_referring_domains: lostReferringDomains,
    });
  }
  return {
    data,
    billing: { path: billingPath("history", "live"), costUsd: 0 },
  };
}
