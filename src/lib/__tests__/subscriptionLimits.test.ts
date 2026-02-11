import { describe, it, expect } from "vitest";
import {
  TIER_LIMITS,
  canPerformAction,
  getRemainingSwipes,
  canAddPortfolioItem,
  getTierDisplayName,
  getUpgradeMessage,
} from "@/lib/subscriptionLimits";

describe("Subscription Limits", () => {
  describe("TIER_LIMITS", () => {
    it("free tier has correct swipe limit", () => {
      expect(TIER_LIMITS.free.swipesPerDay).toBe(30);
    });

    it("pro tier has unlimited swipes", () => {
      expect(TIER_LIMITS.pro.swipesPerDay).toBe(-1);
    });

    it("free tier cannot undo swipes", () => {
      expect(TIER_LIMITS.free.canUndoSwipe).toBe(false);
    });

    it("pro tier can undo swipes", () => {
      expect(TIER_LIMITS.pro.canUndoSwipe).toBe(true);
    });

    it("free tier limited to 5 portfolio items", () => {
      expect(TIER_LIMITS.free.maxPortfolioItems).toBe(5);
    });

    it("pro tier has unlimited portfolio items", () => {
      expect(TIER_LIMITS.pro.maxPortfolioItems).toBe(-1);
    });
  });

  describe("canPerformAction", () => {
    it("returns false for free tier gated features", () => {
      expect(canPerformAction("free", "canUndoSwipe")).toBe(false);
      expect(canPerformAction("free", "canVerifyProfile")).toBe(false);
      expect(canPerformAction("free", "hasAIMatchExplanations")).toBe(false);
    });

    it("returns true for pro tier features", () => {
      expect(canPerformAction("pro", "canUndoSwipe")).toBe(true);
      expect(canPerformAction("pro", "canVerifyProfile")).toBe(true);
      expect(canPerformAction("pro", "hasAdvancedFilters")).toBe(true);
    });

    it("returns true for free tier numeric limits (truthy check)", () => {
      expect(canPerformAction("free", "swipesPerDay")).toBe(true);
    });
  });

  describe("getRemainingSwipes", () => {
    it("calculates remaining swipes for free tier", () => {
      expect(getRemainingSwipes("free", 0)).toBe(30);
      expect(getRemainingSwipes("free", 10)).toBe(20);
      expect(getRemainingSwipes("free", 30)).toBe(0);
      expect(getRemainingSwipes("free", 35)).toBe(0); // never negative
    });

    it("returns -1 (unlimited) for pro tier", () => {
      expect(getRemainingSwipes("pro", 0)).toBe(-1);
      expect(getRemainingSwipes("pro", 999)).toBe(-1);
    });
  });

  describe("canAddPortfolioItem", () => {
    it("limits free tier portfolio items", () => {
      expect(canAddPortfolioItem("free", 0)).toBe(true);
      expect(canAddPortfolioItem("free", 4)).toBe(true);
      expect(canAddPortfolioItem("free", 5)).toBe(false);
      expect(canAddPortfolioItem("free", 10)).toBe(false);
    });

    it("allows unlimited for pro tier", () => {
      expect(canAddPortfolioItem("pro", 0)).toBe(true);
      expect(canAddPortfolioItem("pro", 100)).toBe(true);
    });
  });

  describe("getTierDisplayName", () => {
    it("returns correct display names", () => {
      expect(getTierDisplayName("free")).toBe("Spark");
      expect(getTierDisplayName("pro")).toBe("Pro");
    });
  });

  describe("getUpgradeMessage", () => {
    it("returns upgrade messages for free tier", () => {
      const msg = getUpgradeMessage("swipesPerDay", "free");
      expect(msg).toContain("Upgrade to Pro");
    });

    it("returns unlocked message for pro tier", () => {
      const msg = getUpgradeMessage("swipesPerDay", "pro");
      expect(msg).toContain("unlocked");
    });
  });
});
