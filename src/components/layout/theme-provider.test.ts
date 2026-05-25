import { expect, test } from "vitest";

import { THEME_STORAGE_KEY } from "./theme-provider";

test("THEME_STORAGE_KEY is 'theme'", () => {
  expect(THEME_STORAGE_KEY).toBe("theme");
});
