import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BLOG_DRAFT_LEAK_GUARD_MSG_PREVIEW,
  BLOG_DRAFT_LEAK_GUARD_MSG_PRODUCTION,
  DRAFT_FLAG_VAR_NAME,
  VERCEL_ENV_VAR_NAME,
  VERCEL_FLAG_VAR_NAME,
  checkVercelDraftGuard,
} from "./blog-errors";

describe("blog-errors", () => {
  beforeEach(() => {
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    delete process.env.BLOG_INCLUDE_DRAFTS;
  });
  afterEach(() => {
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    delete process.env.BLOG_INCLUDE_DRAFTS;
  });

  describe("constant literals", () => {
    it("VERCEL_ENV_VAR_NAME equals 'VERCEL_ENV'", () => {
      expect(VERCEL_ENV_VAR_NAME).toBe("VERCEL_ENV");
    });
    it("VERCEL_FLAG_VAR_NAME equals 'VERCEL'", () => {
      expect(VERCEL_FLAG_VAR_NAME).toBe("VERCEL");
    });
    it("DRAFT_FLAG_VAR_NAME equals 'BLOG_INCLUDE_DRAFTS'", () => {
      expect(DRAFT_FLAG_VAR_NAME).toBe("BLOG_INCLUDE_DRAFTS");
    });
  });

  describe("message constants", () => {
    it("BLOG_DRAFT_LEAK_GUARD_MSG_PRODUCTION mentions all three env var names", () => {
      expect(BLOG_DRAFT_LEAK_GUARD_MSG_PRODUCTION).toContain("VERCEL");
      expect(BLOG_DRAFT_LEAK_GUARD_MSG_PRODUCTION).toContain("VERCEL_ENV");
      expect(BLOG_DRAFT_LEAK_GUARD_MSG_PRODUCTION).toContain("BLOG_INCLUDE_DRAFTS");
    });
    it("BLOG_DRAFT_LEAK_GUARD_MSG_PREVIEW mentions all three env var names", () => {
      expect(BLOG_DRAFT_LEAK_GUARD_MSG_PREVIEW).toContain("VERCEL");
      expect(BLOG_DRAFT_LEAK_GUARD_MSG_PREVIEW).toContain("VERCEL_ENV");
      expect(BLOG_DRAFT_LEAK_GUARD_MSG_PREVIEW).toContain("BLOG_INCLUDE_DRAFTS");
    });
  });

  describe("checkVercelDraftGuard guarded paths", () => {
    it("returns {kind: 'production'} when VERCEL=1, VERCEL_ENV=production, BLOG_INCLUDE_DRAFTS=1", () => {
      process.env.VERCEL = "1";
      process.env.VERCEL_ENV = "production";
      process.env.BLOG_INCLUDE_DRAFTS = "1";
      expect(checkVercelDraftGuard()).toEqual({ kind: "production" });
    });

    it("returns {kind: 'preview'} when VERCEL=1, VERCEL_ENV=preview, BLOG_INCLUDE_DRAFTS unset", () => {
      process.env.VERCEL = "1";
      process.env.VERCEL_ENV = "preview";
      expect(checkVercelDraftGuard()).toEqual({ kind: "preview" });
    });

    it("returns {kind: 'preview'} when VERCEL=1, VERCEL_ENV=preview, BLOG_INCLUDE_DRAFTS=0", () => {
      process.env.VERCEL = "1";
      process.env.VERCEL_ENV = "preview";
      process.env.BLOG_INCLUDE_DRAFTS = "0";
      expect(checkVercelDraftGuard()).toEqual({ kind: "preview" });
    });
  });

  describe("checkVercelDraftGuard happy paths (returns null)", () => {
    it("returns null when all three env vars are unset", () => {
      expect(checkVercelDraftGuard()).toBeNull();
    });

    it("returns null when VERCEL unset, VERCEL_ENV=production, BLOG_INCLUDE_DRAFTS=1 (local dev with stray env vars)", () => {
      process.env.VERCEL_ENV = "production";
      process.env.BLOG_INCLUDE_DRAFTS = "1";
      expect(checkVercelDraftGuard()).toBeNull();
    });

    it("returns null when VERCEL=1, VERCEL_ENV=production, BLOG_INCLUDE_DRAFTS unset (correct production)", () => {
      process.env.VERCEL = "1";
      process.env.VERCEL_ENV = "production";
      expect(checkVercelDraftGuard()).toBeNull();
    });

    it("returns null when VERCEL=1, VERCEL_ENV=preview, BLOG_INCLUDE_DRAFTS=1 (correct preview)", () => {
      process.env.VERCEL = "1";
      process.env.VERCEL_ENV = "preview";
      process.env.BLOG_INCLUDE_DRAFTS = "1";
      expect(checkVercelDraftGuard()).toBeNull();
    });

    it("returns null when VERCEL=1, VERCEL_ENV=development (Vercel dev env, no opinion)", () => {
      process.env.VERCEL = "1";
      process.env.VERCEL_ENV = "development";
      expect(checkVercelDraftGuard()).toBeNull();
    });
  });

  describe("checkVercelDraftGuard looks-like-prod backport (Task 4)", () => {
    it("returns null when VERCEL=1, VERCEL_ENV=development, BLOG_INCLUDE_DRAFTS=1 (no-regression: development is exempt)", () => {
      process.env.VERCEL = "1";
      process.env.VERCEL_ENV = "development";
      process.env.BLOG_INCLUDE_DRAFTS = "1";
      expect(checkVercelDraftGuard()).toBeNull();
    });

    it("returns {kind: 'production'} when VERCEL=1, VERCEL_ENV='', BLOG_INCLUDE_DRAFTS=1 (looks-like-prod fires)", () => {
      process.env.VERCEL = "1";
      process.env.VERCEL_ENV = "";
      process.env.BLOG_INCLUDE_DRAFTS = "1";
      expect(checkVercelDraftGuard()).toEqual({ kind: "production" });
    });

    it("returns {kind: 'production'} when VERCEL=1, VERCEL_ENV='staging', BLOG_INCLUDE_DRAFTS=1 (looks-like-prod fires)", () => {
      process.env.VERCEL = "1";
      process.env.VERCEL_ENV = "staging";
      process.env.BLOG_INCLUDE_DRAFTS = "1";
      expect(checkVercelDraftGuard()).toEqual({ kind: "production" });
    });
  });
});
