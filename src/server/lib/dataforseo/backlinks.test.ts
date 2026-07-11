import { describe, expect, it } from "vitest";
import {
  fetchBacklinksRows,
  fetchBacklinksSummary,
  normalizeBacklinksTarget,
} from "@/server/lib/dataforseo/backlinks";

describe("normalizeBacklinksTarget", () => {
  it("treats explicit homepage URLs as page lookups", () => {
    expect(normalizeBacklinksTarget("https://Example.com/")).toEqual({
      apiTarget: "https://example.com/",
      displayTarget: "https://example.com/",
      scope: "page",
    });
  });

  it("trims trailing slashes from non-root page URLs", () => {
    expect(
      normalizeBacklinksTarget("https://github.com/every-app/open-seo/"),
    ).toEqual({
      apiTarget: "https://github.com/every-app/open-seo",
      displayTarget: "https://github.com/every-app/open-seo",
      scope: "page",
    });
  });

  it("treats bare hostnames as domain lookups", () => {
    expect(normalizeBacklinksTarget("Example.com")).toEqual({
      apiTarget: "example.com",
      displayTarget: "example.com",
      scope: "domain",
    });
  });

  it("lets callers force domain scope for full URLs", () => {
    expect(
      normalizeBacklinksTarget("https://Example.com/pricing", {
        scope: "domain",
      }),
    ).toEqual({
      apiTarget: "example.com",
      displayTarget: "example.com",
      scope: "domain",
    });
  });

  it("lets callers force page scope for bare hostnames", () => {
    expect(normalizeBacklinksTarget("Example.com", { scope: "page" })).toEqual({
      apiTarget: "https://example.com/",
      displayTarget: "https://example.com/",
      scope: "page",
    });
  });

  it("rejects page targets with query strings or fragments", () => {
    expectValidationError(() =>
      normalizeBacklinksTarget("https://example.com/pricing?token=secret#hero"),
    );
  });

  it("rejects page targets with embedded credentials", () => {
    expectValidationError(() =>
      normalizeBacklinksTarget("https://user:pass@example.com/private"),
    );
  });

  it("rejects hostnames with unrecognized public suffixes before provider calls", () => {
    expectValidationError(() => normalizeBacklinksTarget("example.invalidtld"));
  });
});

describe("mock fetchers", () => {
  it("returns the same summary for the same target across calls", async () => {
    const first = await fetchBacklinksSummary({ target: "example.com" });
    const second = await fetchBacklinksSummary({ target: "example.com" });
    expect(first.data).toEqual(second.data);
  });

  it("respects limit/offset and keeps totalCount stable across pages", async () => {
    const pageOne = await fetchBacklinksRows({
      target: "example.com",
      limit: 5,
      offset: 0,
    });
    const pageTwo = await fetchBacklinksRows({
      target: "example.com",
      limit: 5,
      offset: 5,
    });
    expect(pageOne.data.items).toHaveLength(5);
    expect(pageTwo.data.items).toHaveLength(5);
    expect(pageOne.data.totalCount).toEqual(pageTwo.data.totalCount);
    expect(pageOne.data.items[0]).not.toEqual(pageTwo.data.items[0]);
  });
});

function expectValidationError(fn: () => unknown) {
  try {
    fn();
  } catch (error) {
    expect(error).toMatchObject({ code: "VALIDATION_ERROR" });
    return;
  }

  throw new Error("Expected normalizeBacklinksTarget to throw");
}
