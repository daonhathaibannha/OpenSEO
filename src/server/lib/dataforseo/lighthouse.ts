import {
  parseDataforseoLighthousePayload,
  type LighthouseStrategy,
} from "@/server/lib/dataforseoLighthousePayload";
import type { StoredLighthousePayload } from "@/server/lib/lighthouseStoredPayload";
import type { DataforseoApiResponse } from "@/server/lib/dataforseo/envelope";
import {
  hashSeed,
  randFloat,
  randInt,
  seededRandom,
} from "@/server/lib/dataforseo/mock/random";

const METRIC_AUDITS: Array<{
  id: string;
  title: string;
  description: string;
  unit: "ms" | "s" | "count";
}> = [
  {
    id: "first-contentful-paint",
    title: "First Contentful Paint",
    description:
      "First Contentful Paint marks the time at which the first text or image is painted.",
    unit: "s",
  },
  {
    id: "largest-contentful-paint",
    title: "Largest Contentful Paint",
    description:
      "Largest Contentful Paint marks the time at which the largest text or image is painted.",
    unit: "s",
  },
  {
    id: "total-blocking-time",
    title: "Total Blocking Time",
    description:
      "Sum of all time periods between FCP and Time to Interactive where task length exceeded 50ms.",
    unit: "ms",
  },
  {
    id: "cumulative-layout-shift",
    title: "Cumulative Layout Shift",
    description:
      "Cumulative Layout Shift measures the movement of visible elements within the viewport.",
    unit: "count",
  },
  {
    id: "speed-index",
    title: "Speed Index",
    description:
      "Speed Index shows how quickly the contents of a page are visibly populated.",
    unit: "s",
  },
  {
    id: "interactive",
    title: "Time to Interactive",
    description:
      "Time to Interactive is the amount of time it takes for the page to become fully interactive.",
    unit: "s",
  },
  {
    id: "interaction-to-next-paint",
    title: "Interaction to Next Paint",
    description:
      "Interaction to Next Paint measures responsiveness to user interactions.",
    unit: "ms",
  },
  {
    id: "server-response-time",
    title: "Initial server response time",
    description: "Keep the server response time for the main document short.",
    unit: "ms",
  },
];

const OPPORTUNITY_AUDITS = [
  {
    id: "render-blocking-resources",
    title: "Eliminate render-blocking resources",
    description: "Resources are blocking the first paint of your page.",
  },
  {
    id: "unused-javascript",
    title: "Reduce unused JavaScript",
    description:
      "Reduce unused JavaScript and defer loading scripts until they are required.",
  },
  {
    id: "uses-responsive-images",
    title: "Properly size images",
    description:
      "Serve images that are appropriately-sized to save cellular data and improve load time.",
  },
];

const CATEGORY_KEYS = [
  "performance",
  "accessibility",
  "best-practices",
  "seo",
] as const;

/** Builds a synthetic, DataForSEO-shaped Lighthouse payload and runs it
 * through the real (unmodified) parser, so scoring/issue-extraction logic is
 * reused exactly as it is for a real Lighthouse run. */
function buildSyntheticLighthousePayload(input: {
  url: string;
  strategy: LighthouseStrategy;
}) {
  const rand = seededRandom(hashSeed(input.url, input.strategy));

  const categories: Record<
    string,
    { score: number; auditRefs: { id: string }[] }
  > = {};
  for (const category of CATEGORY_KEYS) {
    categories[category] = {
      score: randFloat(rand, 0.45, 0.99, 2),
      auditRefs: [
        ...METRIC_AUDITS.filter(() => category === "performance").map((a) => ({
          id: a.id,
        })),
        ...OPPORTUNITY_AUDITS.filter(() => category === "performance").map(
          (a) => ({ id: a.id }),
        ),
      ],
    };
  }

  const audits: Record<
    string,
    {
      score: number | null;
      displayValue: string;
      numericValue: number;
      title: string;
      description: string;
      scoreDisplayMode: string;
    }
  > = {};
  for (const metric of METRIC_AUDITS) {
    const score = randFloat(rand, 0.4, 0.99, 2);
    const numericValue =
      metric.unit === "s"
        ? randFloat(rand, 0.5, 6, 2) * 1000
        : metric.unit === "ms"
          ? randInt(rand, 20, 600)
          : randFloat(rand, 0, 0.4, 3);
    audits[metric.id] = {
      score,
      displayValue:
        metric.unit === "count"
          ? String(numericValue)
          : metric.unit === "s"
            ? `${(numericValue / 1000).toFixed(1)} s`
            : `${Math.round(numericValue)} ms`,
      numericValue,
      title: metric.title,
      description: metric.description,
      scoreDisplayMode: "numeric",
    };
  }
  for (const opportunity of OPPORTUNITY_AUDITS) {
    const score = randFloat(rand, 0.3, 0.95, 2);
    audits[opportunity.id] = {
      score,
      displayValue: `Potential savings of ${randInt(rand, 50, 800)} ms`,
      numericValue: randInt(rand, 50, 800),
      title: opportunity.title,
      description: opportunity.description,
      scoreDisplayMode: "numeric",
    };
  }

  return {
    status_code: 20000,
    status_message: "Ok.",
    tasks: [
      {
        id: `mock-${hashSeed(input.url, input.strategy)}`,
        cost: 0,
        status_code: 20000,
        status_message: "Ok.",
        result: [
          {
            requestedUrl: input.url,
            finalUrl: input.url,
            lighthouseVersion: "12.0.0 (mock)",
            categories,
            audits,
          },
        ],
      },
    ],
  };
}

export async function fetchLighthouseResult(input: {
  url: string;
  strategy: LighthouseStrategy;
}): Promise<DataforseoApiResponse<StoredLighthousePayload>> {
  const payload = buildSyntheticLighthousePayload(input);
  const data = parseDataforseoLighthousePayload(payload, input);
  return {
    data,
    billing: {
      path: ["v3", "on_page", "lighthouse", "live", "json"],
      costUsd: 0,
    },
  };
}
