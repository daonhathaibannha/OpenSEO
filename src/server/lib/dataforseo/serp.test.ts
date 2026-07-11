import { describe, expect, it } from "vitest";
import {
  fetchRankCheckTaskResult,
  postRankCheckTasks,
} from "@/server/lib/dataforseo/serp";

describe("rank check task queue (mock)", () => {
  it("posts every task and echoes each keywordId:device tag as a taskId", async () => {
    const result = await postRankCheckTasks({
      tasks: [
        { keyword: "alpha", keywordId: "kw-1", device: "desktop" },
        { keyword: "alpha", keywordId: "kw-1", device: "mobile" },
        { keyword: "beta", keywordId: "kw-2", device: "desktop" },
      ],
      locationCode: 2840,
      languageCode: "en",
      depth: 20,
      targetDomain: "example.com",
    });

    expect(result.data).toHaveLength(3);
    expect(
      result.data.map((task) => `${task.keywordId}:${task.device}`),
    ).toEqual(["kw-1:desktop", "kw-1:mobile", "kw-2:desktop"]);
    for (const task of result.data) {
      expect(task.taskId).toBeTruthy();
    }
    expect(result.billing.path).toEqual([
      "v3",
      "serp",
      "google",
      "organic",
      "task_post",
    ]);
  });

  it("rejects an empty or oversized task batch", async () => {
    await expect(
      postRankCheckTasks({
        tasks: [],
        locationCode: 2840,
        languageCode: "en",
        depth: 20,
        targetDomain: "example.com",
      }),
    ).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
  });

  it("resolves a queued task result as completed on the first call", async () => {
    const outcome = await fetchRankCheckTaskResult({
      taskId: "mock-123",
      keywordId: "kw-1",
      keyword: "alpha",
      targetDomain: "example.com",
    });

    expect(outcome.status).toBe("completed");
  });

  it("returns the same rank check result for the same input across calls", async () => {
    const input = {
      taskId: "mock-123",
      keywordId: "kw-1",
      keyword: "alpha",
      targetDomain: "example.com",
    };
    const first = await fetchRankCheckTaskResult(input);
    const second = await fetchRankCheckTaskResult(input);
    expect(first).toEqual(second);
  });
});
