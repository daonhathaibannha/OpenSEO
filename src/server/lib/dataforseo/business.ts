import {
  BusinessDataBusinessListingsSearchLiveItem,
  RatingInfo,
  type IBusinessDataBusinessListingsSearchLiveItem,
} from "dataforseo-client";
import type { DataforseoApiResponse } from "@/server/lib/dataforseo/envelope";
import {
  hashSeed,
  pick,
  randFloat,
  randInt,
  seededRandom,
} from "@/server/lib/dataforseo/mock/random";

type BusinessListingItem = IBusinessDataBusinessListingsSearchLiveItem;

const BUSINESS_NAME_PARTS = [
  "Summit",
  "Riverside",
  "Golden Gate",
  "Cedar Grove",
  "Harborview",
  "Maple Street",
  "Union Square",
  "Lakeside",
  "Northgate",
  "Old Town",
];
const BUSINESS_NAME_SUFFIXES = [
  "Bakery",
  "Auto Repair",
  "Dental Care",
  "Coffee Roasters",
  "Law Office",
  "Fitness Studio",
  "Plumbing",
  "Salon & Spa",
  "Pizzeria",
  "Bookstore",
];
const STREETS = [
  "Main St",
  "Market St",
  "Broadway",
  "5th Ave",
  "Oak St",
  "Elm St",
  "Park Ave",
];

function fakeBusinessListing(
  seed: number,
  categories: string[] | undefined,
): BusinessListingItem {
  const rand = seededRandom(seed);
  const category = categories?.length
    ? pick(rand, categories)
    : pick(rand, BUSINESS_NAME_SUFFIXES);
  const title = `${pick(rand, BUSINESS_NAME_PARTS)} ${pick(rand, BUSINESS_NAME_SUFFIXES)}`;
  return new BusinessDataBusinessListingsSearchLiveItem({
    type: "business_listing_search",
    title,
    category,
    address: `${randInt(rand, 100, 9999)} ${pick(rand, STREETS)}`,
    phone: `+1${randInt(rand, 2000000000, 9999999999)}`,
    domain: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "")}.example.com`,
    url: `https://${title.toLowerCase().replace(/[^a-z0-9]+/g, "")}.example.com`,
    rating: new RatingInfo({
      rating_type: "Max5",
      value: randFloat(rand, 3.2, 5, 1),
      votes_count: randInt(rand, 3, 850),
      rating_max: 5,
    }),
    is_claimed: rand() > 0.3,
    first_seen: "2023-01-15 09:00:00 +00:00",
  });
}

export async function fetchBusinessListingsSearch(input: {
  categories?: string[];
  title?: string;
  locationCoordinate: string;
  orderBy?: string[];
  limit: number;
}): Promise<DataforseoApiResponse<BusinessListingItem[]>> {
  const baseSeed = hashSeed(
    input.title ?? "",
    input.categories?.join(",") ?? "",
    input.locationCoordinate,
  );
  const count = Math.max(0, Math.min(input.limit, 20));
  const data = Array.from({ length: count }, (_, index) =>
    fakeBusinessListing(baseSeed + index, input.categories),
  );
  return {
    data,
    billing: {
      path: [
        "v3",
        "business_data",
        "google",
        "business_listings_search",
        "live",
      ],
      costUsd: 0,
    },
  };
}

const PROFILE_NAMES = [
  "Alex M.",
  "Jordan P.",
  "Sam K.",
  "Taylor R.",
  "Morgan L.",
];
const TIME_AGO = ["2 weeks ago", "1 month ago", "3 months ago", "1 year ago"];

function fakeQuestion(seed: number, keyword: string): Record<string, unknown> {
  const rand = seededRandom(seed);
  const hasAnswer = rand() > 0.25;
  return {
    question_text: `Does this business handle ${keyword}?`,
    profile_name: pick(rand, PROFILE_NAMES),
    time_ago: pick(rand, TIME_AGO),
    items: hasAnswer
      ? [
          {
            answer_text: `Yes, we offer ${keyword} — feel free to call ahead.`,
            profile_name: pick(rand, PROFILE_NAMES),
            time_ago: pick(rand, TIME_AGO),
          },
        ]
      : [],
  };
}

export async function fetchQuestionsAnswers(input: {
  keyword: string;
  locationCoordinate: string;
  languageCode: string;
  depth: number;
}): Promise<DataforseoApiResponse<Record<string, unknown>[]>> {
  const baseSeed = hashSeed(
    input.keyword,
    input.locationCoordinate,
    input.languageCode,
  );
  const count = Math.max(0, Math.min(Math.ceil(input.depth / 5), 10));
  const data = Array.from({ length: count }, (_, index) =>
    fakeQuestion(baseSeed + index, input.keyword),
  );
  return {
    data,
    billing: {
      path: ["v3", "business_data", "google", "questions_and_answers", "live"],
      costUsd: 0,
    },
  };
}
