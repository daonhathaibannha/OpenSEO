import type {
  LlmAggregatedTotal,
  LlmCrossAggregatedItem,
  LlmMentionItem,
  LlmResponseResult,
  LlmTopPagesItem,
} from "@/server/lib/dataforseoLlmSchemas";
import { AppError } from "@/server/lib/errors";
import type { DataforseoApiResponse } from "@/server/lib/dataforseo/envelope";
import {
  hashSeed,
  pick,
  randFloat,
  randInt,
  seededRandom,
  weightedBool,
} from "@/server/lib/dataforseo/mock/random";

// ChatGPT mention/response data is only available for US/en per DataForSEO docs.
export const CHATGPT_LOCATION_CODE = 2840;
export const CHATGPT_LANGUAGE_CODE = "en";

export type LlmPlatform = "chat_gpt" | "google";

// ---------------------------------------------------------------------------
// Target builders — DataForSEO's `target` array accepts domain OR keyword
// entries. We always pass exactly one target per call.
// ---------------------------------------------------------------------------

type LlmTarget =
  | {
      domain: string;
      include_subdomains?: boolean;
      search_filter?: "include" | "exclude";
      search_scope?: string[];
    }
  | {
      keyword: string;
      search_filter?: "include" | "exclude";
      search_scope?: string[];
      match_type?: "word_match" | "partial_match";
    };

export function buildLlmTarget(input: {
  type: "domain" | "keyword";
  value: string;
}): LlmTarget {
  if (input.type === "domain") {
    return {
      domain: input.value,
      include_subdomains: true,
      search_filter: "include",
      search_scope: ["any"],
    };
  }
  return {
    keyword: input.value,
    search_filter: "include",
    search_scope: ["any", "brand_entities"],
    match_type: "word_match",
  };
}

function targetLabel(target: LlmTarget): string {
  return "domain" in target ? target.domain : target.keyword;
}

function clampLimit(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function billingPath(...segments: string[]) {
  return ["v3", "ai_optimization", ...segments];
}

// ---------------------------------------------------------------------------
// LLM Mentions Search
// ---------------------------------------------------------------------------

type LlmMentionsSearchInput = {
  target: LlmTarget;
  platform: LlmPlatform;
  locationCode: number;
  languageCode: string;
  limit?: number;
};

const SAMPLE_QUESTION_TEMPLATES = [
  "What is {label}?",
  "Is {label} worth it?",
  "How does {label} compare to alternatives?",
  "What are the best features of {label}?",
  "How much does {label} cost?",
];

function monthlySearches(rand: () => number, base: number) {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      search_volume: Math.max(
        0,
        Math.round(base * randFloat(rand, 0.7, 1.3, 2)),
      ),
    };
  });
}

export async function fetchLlmMentionsSearch(
  input: LlmMentionsSearchInput,
): Promise<DataforseoApiResponse<LlmMentionItem[]>> {
  const label = targetLabel(input.target);
  const baseSeed = hashSeed(label, input.platform);
  const count = Math.min(clampLimit(input.limit ?? 100, 1, 1000), 12);
  const data: LlmMentionItem[] = Array.from({ length: count }, (_, i) => {
    const rand = seededRandom(baseSeed + i);
    const question = pick(rand, SAMPLE_QUESTION_TEMPLATES).replace(
      "{label}",
      label,
    );
    const volume = randInt(rand, 5, 5000);
    return {
      question,
      sources: [
        {
          url: `https://example.com/${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          title: `${label} — Overview`,
          domain: "example.com",
        },
      ],
      ai_search_volume: volume,
      monthly_searches: monthlySearches(rand, volume),
      first_response_at: "2026-01-15",
      last_response_at: "2026-06-15",
      brand_entities: [{ title: label }],
    };
  });
  return {
    data,
    billing: {
      path: billingPath("llm_mentions", "search", "live"),
      costUsd: 0,
    },
  };
}

// ---------------------------------------------------------------------------
// LLM Mentions Aggregated Metrics
// ---------------------------------------------------------------------------

type LlmAggregatedMetricsInput = {
  target: LlmTarget;
  platform: LlmPlatform;
  locationCode: number;
  languageCode: string;
  internalListLimit?: number;
};

export async function fetchLlmAggregatedMetrics(
  input: LlmAggregatedMetricsInput,
): Promise<DataforseoApiResponse<LlmAggregatedTotal>> {
  const rand = seededRandom(
    hashSeed(targetLabel(input.target), input.platform),
  );
  const mentions = randInt(rand, 1, 400);
  const data: LlmAggregatedTotal = {
    platform: [
      {
        type: "platform",
        key: input.platform,
        mentions,
        ai_search_volume: randInt(rand, mentions, mentions * 20),
        impressions: randInt(rand, mentions * 2, mentions * 50),
      },
    ],
  };
  return {
    data,
    billing: {
      path: billingPath("llm_mentions", "aggregated_metrics", "live"),
      costUsd: 0,
    },
  };
}

// ---------------------------------------------------------------------------
// LLM Mentions Top Pages
// ---------------------------------------------------------------------------

type LlmTopPagesInput = {
  target: LlmTarget;
  platform: LlmPlatform;
  locationCode: number;
  languageCode: string;
  itemsListLimit?: number;
};

export async function fetchLlmTopPages(
  input: LlmTopPagesInput,
): Promise<DataforseoApiResponse<LlmTopPagesItem[]>> {
  const label = targetLabel(input.target);
  const baseSeed = hashSeed(label, input.platform, "top-pages");
  const count = clampLimit(input.itemsListLimit ?? 10, 1, 10);
  const data: LlmTopPagesItem[] = Array.from({ length: count }, (_, i) => {
    const rand = seededRandom(baseSeed + i);
    const mentions = randInt(rand, 1, 100);
    return {
      key: `https://example.com/${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${i + 1}`,
      platform: [
        {
          type: "platform",
          key: input.platform,
          mentions,
          ai_search_volume: randInt(rand, mentions, mentions * 10),
        },
      ],
    };
  });
  return {
    data,
    billing: {
      path: billingPath("llm_mentions", "top_pages", "live"),
      costUsd: 0,
    },
  };
}

// ---------------------------------------------------------------------------
// LLM Mentions Cross-Aggregated Metrics
// Compares 2..10 aggregation groups (target + competitors) in one call and
// returns one item per group, keyed by its aggregation_key (brand label).
// ---------------------------------------------------------------------------

type LlmCrossAggregatedMetricsInput = {
  groups: Array<{ key: string; target: LlmTarget }>;
  platform: LlmPlatform;
  locationCode: number;
  languageCode: string;
  internalListLimit?: number;
};

export async function fetchLlmCrossAggregatedMetrics(
  input: LlmCrossAggregatedMetricsInput,
): Promise<DataforseoApiResponse<LlmCrossAggregatedItem[]>> {
  if (input.groups.length < 2 || input.groups.length > 10) {
    throw new AppError(
      "VALIDATION_ERROR",
      "DataForSEO llm_mentions/cross_aggregated_metrics requires 2 to 10 target groups",
    );
  }

  const data: LlmCrossAggregatedItem[] = input.groups.map((group) => {
    const rand = seededRandom(
      hashSeed(group.key, targetLabel(group.target), input.platform),
    );
    const mentions = randInt(rand, 0, 300);
    return {
      key: group.key,
      platform: [
        {
          type: "platform",
          key: input.platform,
          mentions,
          ai_search_volume: randInt(rand, mentions, mentions * 15 + 1),
        },
      ],
    };
  });
  return {
    data,
    billing: {
      path: billingPath("llm_mentions", "cross_aggregated_metrics", "live"),
      costUsd: 0,
    },
  };
}

// ---------------------------------------------------------------------------
// LLM Responses (per-model)
// ---------------------------------------------------------------------------

type LlmResponseModelSlug = "chat_gpt" | "claude" | "gemini" | "perplexity";

/**
 * Accepted `model_name` values per slug, mirroring DataForSEO's model catalog.
 * Kept from the real implementation so callers passing a stale/unknown model
 * name still get the same validation error as before.
 */
const ACCEPTED_LLM_MODEL_NAMES: Record<
  LlmResponseModelSlug,
  ReadonlySet<string>
> = {
  chat_gpt: new Set(["gpt-5"]),
  claude: new Set(["claude-sonnet-4-5", "claude-sonnet-4-6"]),
  gemini: new Set(["gemini-2.5-pro"]),
  perplexity: new Set(["sonar-reasoning-pro", "sonar-pro", "sonar"]),
};

type LlmResponsesInput = {
  userPrompt: string;
  modelSlug: LlmResponseModelSlug;
  modelName: string;
  webSearch?: boolean;
  maxOutputTokens?: number;
  webSearchCountryCode?: string;
};

export async function fetchLlmResponse(
  input: LlmResponsesInput,
): Promise<DataforseoApiResponse<LlmResponseResult>> {
  if (!ACCEPTED_LLM_MODEL_NAMES[input.modelSlug].has(input.modelName)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Unsupported DataForSEO model_name "${input.modelName}" for ${input.modelSlug}`,
    );
  }

  const rand = seededRandom(hashSeed(input.userPrompt, input.modelSlug));
  const webSearch = input.webSearch ?? true;
  const promptSnippet = input.userPrompt.slice(0, 80);
  const data: LlmResponseResult = {
    model_name: input.modelName,
    output_tokens: randInt(
      rand,
      120,
      clampLimit(input.maxOutputTokens ?? 1024, 256, 4096),
    ),
    web_search: webSearch,
    items: [
      {
        type: "message",
        sections: [
          {
            type: "text",
            text: `Regarding "${promptSnippet}" — here is a synthesized answer based on generally available information.`,
            annotations: webSearch
              ? [
                  {
                    type: "citation",
                    title: "Example Source",
                    url: "https://example.com/reference",
                  },
                ]
              : [],
          },
        ],
      },
    ],
    fan_out_queries: weightedBool(rand, 0.6)
      ? [promptSnippet, `${promptSnippet} reviews`]
      : [],
  };
  return {
    data,
    billing: {
      path: billingPath(input.modelSlug, "llm_responses", "live"),
      costUsd: 0,
    },
  };
}
