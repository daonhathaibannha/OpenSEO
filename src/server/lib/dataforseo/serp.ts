import { z } from "zod";
import type { DataforseoApiResponse } from "@/server/lib/dataforseo/envelope";
import { AppError } from "@/server/lib/errors";
import {
  hashSeed,
  pick,
  randFloat,
  randInt,
  seededRandom,
  weightedBool,
} from "@/server/lib/dataforseo/mock/random";

// Kept as a hand-written schema so the shape stays exactly what
// buildRankCheckResult and downstream callers expect.
const serpSnapshotItemSchema = z
  .object({
    type: z.string(),
    rank_group: z.number().nullable().optional(),
    rank_absolute: z.number().nullable().optional(),
    domain: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    breadcrumb: z.string().nullable().optional(),
    etv: z.number().nullable().optional(),
    estimated_paid_traffic_cost: z.number().nullable().optional(),
    backlinks_info: z
      .object({
        referring_domains: z.number().nullable().optional(),
        backlinks: z.number().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    rank_changes: z
      .object({
        previous_rank_absolute: z.number().nullable().optional(),
        is_new: z.boolean().nullable().optional(),
        is_up: z.boolean().nullable().optional(),
        is_down: z.boolean().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

export type SerpLiveItem = z.infer<typeof serpSnapshotItemSchema>;

const COMPETITOR_DOMAINS = [
  "topresource.example",
  "industryguide.example",
  "expertadvice.example",
  "reviewsite.example",
  "marketleader.example",
  "helpfulblog.example",
  "comparisontool.example",
  "officialdirectory.example",
  "communityforum.example",
  "newsoutlet.example",
];

/** Generates a seeded page of organic SERP results, optionally inserting
 * `targetDomain` at a seeded rank (or omitting it, so "not ranking" is a
 * possible outcome too). */
function fakeOrganicSerpItems(
  seed: number,
  keyword: string,
  count: number,
  targetDomain?: string,
): SerpLiveItem[] {
  const rand = seededRandom(seed);
  const targetRank =
    targetDomain && weightedBool(rand, 0.7)
      ? randInt(rand, 1, count)
      : undefined;
  return Array.from({ length: count }, (_, i) => {
    const rankAbsolute = i + 1;
    const isTarget = targetRank === rankAbsolute;
    const domain = isTarget
      ? targetDomain!
      : `${pick(rand, COMPETITOR_DOMAINS).split(".")[0]}${randInt(rand, 1, 99)}.example`;
    return {
      type: "organic",
      rank_group: rankAbsolute,
      rank_absolute: rankAbsolute,
      domain,
      title: `${keyword} — ${domain}`,
      url: `https://${domain}/${keyword.replace(/\s+/g, "-").toLowerCase()}`,
      description: `Everything you need to know about ${keyword}.`,
      etv: randFloat(rand, 1, 500, 1),
      estimated_paid_traffic_cost: randFloat(rand, 1, 300, 2),
      backlinks_info: {
        referring_domains: randInt(rand, 1, 500),
        backlinks: randInt(rand, 1, 5000),
      },
    };
  });
}

function billingPath(...segments: string[]) {
  return ["v3", "serp", "google", ...segments];
}

export async function fetchLiveSerp(input: {
  keyword: string;
  locationCode: number;
  languageCode: string;
}): Promise<DataforseoApiResponse<SerpLiveItem[]>> {
  const seed = hashSeed(input.keyword, input.locationCode, input.languageCode);
  const data = fakeOrganicSerpItems(seed, input.keyword, 20);
  return {
    data,
    billing: { path: billingPath("organic", "live_advanced"), costUsd: 0 },
  };
}

export interface RankCheckResult {
  keywordId: string;
  keyword: string;
  position: number | null;
  url: string | null;
  serpFeatures: string[];
}

function buildRankCheckResult(
  input: { keywordId: string; keyword: string; targetDomain: string },
  items: SerpLiveItem[],
): RankCheckResult {
  const target = input.targetDomain.toLowerCase();
  const organicMatch = items.find((item) => {
    if (item.type !== "organic" || item.domain == null) return false;
    const domain = item.domain.toLowerCase();
    return domain === target || domain.endsWith(`.${target}`);
  });

  return {
    keywordId: input.keywordId,
    keyword: input.keyword,
    position: organicMatch
      ? (organicMatch.rank_absolute ?? organicMatch.rank_group ?? null)
      : null,
    url: organicMatch?.url ?? null,
    serpFeatures: [...new Set(items.map((item) => item.type).filter(Boolean))],
  };
}

export async function fetchRankCheckSerp(input: {
  keyword: string;
  keywordId: string;
  locationCode: number;
  languageCode: string;
  locationName?: string;
  device: "desktop" | "mobile";
  targetDomain: string;
  depth: number;
}): Promise<DataforseoApiResponse<RankCheckResult>> {
  const seed = hashSeed(
    input.keyword,
    input.locationName ?? input.locationCode,
    input.device,
    input.targetDomain,
  );
  const items = fakeOrganicSerpItems(
    seed,
    input.keyword,
    Math.min(input.depth, 100),
    input.targetDomain,
  );
  return {
    data: buildRankCheckResult(input, items),
    billing: { path: billingPath("organic", "live_advanced"), costUsd: 0 },
  };
}

// ---------------------------------------------------------------------------
// Task-queue rank checks (scheduled runs). Real DataForSEO flow is
// task_post -> poll task_get -> live fallback; the mock resolves every task
// immediately as "completed" instead of simulating queue latency.
// ---------------------------------------------------------------------------

/** Max tasks DataForSEO accepts in a single task_post request. */
export const MAX_TASKS_PER_POST = 100;

export interface RankCheckTaskInput {
  keyword: string;
  keywordId: string;
  device: "desktop" | "mobile";
}

export interface PostedRankCheckTask extends RankCheckTaskInput {
  taskId: string;
}

export async function postRankCheckTasks(input: {
  tasks: RankCheckTaskInput[];
  locationCode: number;
  languageCode: string;
  locationName?: string;
  depth: number;
  targetDomain: string;
}): Promise<DataforseoApiResponse<PostedRankCheckTask[]>> {
  if (input.tasks.length === 0 || input.tasks.length > MAX_TASKS_PER_POST) {
    throw new AppError(
      "INTERNAL_ERROR",
      `task_post accepts 1-${MAX_TASKS_PER_POST} tasks, got ${input.tasks.length}`,
    );
  }
  // Every task is accepted in the mock — the tag is echoed exactly as the
  // real endpoint does, since callers map a posted task back to its keyword
  // by this tag.
  const posted: PostedRankCheckTask[] = input.tasks.map((task) => ({
    ...task,
    taskId: `mock-${hashSeed(task.keywordId, task.device, Date.now())}`,
  }));
  return {
    data: posted,
    billing: { path: billingPath("organic", "task_post"), costUsd: 0 },
  };
}

type RankCheckTaskOutcome =
  | { status: "pending" }
  | { status: "failed"; message: string }
  | { status: "completed"; result: RankCheckResult };

/**
 * Mock collection resolves immediately as "completed" — there's no real
 * queue to poll, and the workflow already sleeps minutes between poll
 * rounds, so staying "pending" here would only add wall-clock delay.
 */
export async function fetchRankCheckTaskResult(input: {
  taskId: string;
  keywordId: string;
  keyword: string;
  targetDomain: string;
}): Promise<RankCheckTaskOutcome> {
  const seed = hashSeed(input.taskId, input.keyword, input.targetDomain);
  const items = fakeOrganicSerpItems(
    seed,
    input.keyword,
    100,
    input.targetDomain,
  );
  return { status: "completed", result: buildRankCheckResult(input, items) };
}

const LOCAL_BUSINESS_TITLES = [
  "Summit Auto Repair",
  "Riverside Dental Care",
  "Golden Gate Coffee",
  "Cedar Grove Law Office",
  "Harborview Fitness",
  "Maple Street Bakery",
  "Union Square Salon",
  "Lakeside Plumbing",
];

function fakeLocalSerpItem(
  seed: number,
  rank: number,
): Record<string, unknown> {
  const rand = seededRandom(seed);
  return {
    type: "local_pack",
    rank_group: rank,
    rank_absolute: rank,
    title: pick(rand, LOCAL_BUSINESS_TITLES),
    rating: {
      rating_type: "Max5",
      value: randFloat(rand, 3.2, 5, 1),
      votes_count: randInt(rand, 3, 850),
    },
    phone: `+1${randInt(rand, 2000000000, 9999999999)}`,
    address: `${randInt(rand, 100, 9999)} Main St`,
  };
}

export async function fetchLocalSerp(input: {
  keyword: string;
  locationCoordinate?: string;
  languageCode: string;
  searchType: "maps" | "local_finder";
  device: "desktop" | "mobile";
  depth: number;
  searchPlaces?: boolean;
}): Promise<DataforseoApiResponse<Record<string, unknown>[]>> {
  const baseSeed = hashSeed(
    input.keyword,
    input.locationCoordinate ?? "",
    input.searchType,
  );
  const count = Math.max(0, Math.min(input.depth, 20));
  const data = Array.from({ length: count }, (_, i) =>
    fakeLocalSerpItem(baseSeed + i, i + 1),
  );
  return {
    data,
    billing: {
      path: billingPath(
        input.searchType === "maps" ? "maps" : "local_finder",
        "live_advanced",
      ),
      costUsd: 0,
    },
  };
}
