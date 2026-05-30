import { defineLoader } from "velite";
import { parse as yamlParse } from "yaml";

import { formatZodIssues, type FormatContext } from "./content-error-format";

/**
 * The minimal schema shape the loader needs: a synchronous `safeParse` plus the
 * `_def`/`shape` introspection surface `formatZodIssues` walks. The per-entry
 * schema modules (Task 2) satisfy this; both their `s.object().strict()` shape
 * and the `formatZodIssues` context are velite's bundled v3 zod (NOT top-level
 * `zod ^4`).
 */
type SafeParseSchema = FormatContext["schema"] & {
  safeParse: (value: unknown) => { success: boolean; error?: { issues: unknown[] } };
};

/**
 * Builds the authoritative content YAML loader. Velite is non-strict, so a zod
 * issue otherwise only warns and ships the bad entry; this loader is the only
 * reliable per-collection hard-fail hook — a `throw` in `load` propagates to a
 * non-zero exit (the CLI surfaces `err.message` untruncated).
 *
 * `schemasByBasename` maps a YAML basename (e.g. `"contributions.yaml"`) to its
 * per-entry schema. A file NOT in the map is passed through untouched (no-op for
 * unmanaged YAML — the loader's `test` matches all `content/**​/*.y(a)ml`, so any
 * future YAML collection flows through here and must register its schema).
 */
export function makeContentYamlLoader(
  schemasByBasename: Record<string, SafeParseSchema>,
) {
  return defineLoader({
    test: /\.(ya?ml)$/,
    load: (file) => {
      const basename = file.path.split(/[\\/]/).pop()!;
      const schema = schemasByBasename[basename];

      // Not ours — benign passthrough (null → empty list).
      if (schema == null) {
        return { data: yamlParse(file.toString()) ?? [] };
      }

      const parsed = yamlParse(file.toString());

      // Envelope checks (named errors match the design verbatim).
      if (parsed == null) {
        throw new Error(
          `${basename} is empty or null. To represent zero entries, write the explicit empty list literal: []`,
        );
      }
      if (!Array.isArray(parsed)) {
        throw new Error(
          `${basename} must be a top-level YAML list. Found a ${typeof parsed}. Write entries as a list ('- ...') or the empty list literal: []`,
        );
      }

      // Authoritative per-entry validation: hard-fail because Velite is non-strict.
      const messages: string[] = [];
      parsed.forEach((entry, index) => {
        let result: { success: boolean; error?: { issues: unknown[] } };
        try {
          // defense-in-depth: a thrown internal error becomes a contract line,
          // not a bare RangeError that escapes safeParse uncaught.
          result = schema.safeParse(entry);
        } catch (error) {
          messages.push(
            `${basename} entry[${index}]: internal validation error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          return;
        }
        if (!result.success) {
          const issues = (result.error?.issues ?? []) as Parameters<typeof formatZodIssues>[0];
          messages.push(...formatZodIssues(issues, { basename, entry, index, schema }));
        }
      });

      if (messages.length > 0) throw new Error("\n" + messages.join("\n"));

      // Raw array; Velite re-parses for transforms + types.
      return { data: parsed };
    },
  });
}
