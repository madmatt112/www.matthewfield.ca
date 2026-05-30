import { s } from "velite";

/**
 * Build-time error-message formatter implementing the **Shared Build-Time
 * Error-Message Contract** (requirements.md §"Shared Build-Time Error-Message
 * Contract"). Every function here is PURE — no I/O.
 *
 * ALL issue-shape introspection (`issue.code`, `issue.options`, `issue.keys`,
 * `_def.values`, `.shape`, `typeName`) is written against velite's bundled
 * v3-shaped zod (imported via `s` from "velite"), NEVER the top-level `zod ^4`
 * dependency — their issue field names differ.
 */

/** Minimal structural view of a velite-v3 ZodIssue (only the fields we read). */
type ZodIssueLike = {
  code: string;
  path: (string | number)[];
  message?: string;
  options?: unknown[];
  keys?: string[];
};

/** Minimal structural view of a velite-v3 zod schema node (only `_def`/`shape`). */
type ZodNodeLike = {
  _def?: {
    typeName?: string;
    schema?: ZodNodeLike;
    in?: ZodNodeLike;
    out?: ZodNodeLike;
    innerType?: ZodNodeLike;
    type?: ZodNodeLike;
    values?: string[];
  };
  shape?: Record<string, ZodNodeLike>;
};

/** Context passed to `formatZodIssues`. */
export type FormatContext = {
  basename: string;
  entry: unknown;
  index: number;
  schema: ZodNodeLike;
  /** Optional per-issue hints, appended after the enum-member list (≤3 each). */
  hints?: (issue: ZodIssueLike) => string[];
};

const TRUNCATE_AT = 80;

/**
 * Serializes the offending value per contract item 4:
 *  - strings: explicit surrounding double-quotes;
 *  - numbers / booleans / null: rendered bare;
 *  - objects / arrays: compact `JSON.stringify`.
 * For strings, `\n` is escaped (backslash + n) BEFORE truncation; truncation to
 * 80 chars keeps the `…` INSIDE the closing quote. For compound values the `…`
 * follows the truncated JSON.
 */
export function serializeValue(value: unknown): string {
  if (typeof value === "string") {
    const escaped = value.replace(/\n/g, "\\n");
    const quoted = `"${escaped}"`;
    if (quoted.length <= TRUNCATE_AT) return quoted;
    // Keep the … inside the closing quote: budget = 80 - 2 quotes - 1 ellipsis.
    const body = escaped.slice(0, TRUNCATE_AT - 3);
    return `"${body}…"`;
  }
  if (value === null) return "null";
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value === undefined) return "undefined";
  // Objects / arrays: compact JSON, … after the JSON when over budget.
  let json: string;
  try {
    json = JSON.stringify(value) ?? String(value);
  } catch {
    json = String(value);
  }
  const escaped = json.replace(/\n/g, "\\n");
  if (escaped.length <= TRUNCATE_AT) return escaped;
  return `${escaped.slice(0, TRUNCATE_AT - 1)}…`;
}

/**
 * Builds the dot-and-bracket field path (contract item 3): numeric segments are
 * bracketed (`[2]`), string segments are dot-joined. `["links", 2, "kind"]`
 * becomes `links[2].kind`.
 */
export function buildFieldPath(path: (string | number)[]): string {
  let out = "";
  for (const segment of path) {
    if (typeof segment === "number") {
      out += `[${segment}]`;
    } else if (out === "") {
      out = segment;
    } else {
      out += `.${segment}`;
    }
  }
  return out;
}

/**
 * Chooses the entry locator (contract item 2). Returns the identifier value
 * (`repo` for contributions, `title` for resources) when the failing field is
 * NOT the identifier field AND the identifier is a non-empty trimmed string;
 * otherwise `entry[<index>]`.
 *
 * If `issue.path[0]` IS the identifier field, ALWAYS uses `entry[<index>]`.
 */
export function chooseLocator(
  issue: ZodIssueLike,
  entry: unknown,
  index: number,
  identifierField: string,
): string {
  const firstSegment = issue.path[0];
  if (firstSegment !== identifierField && entry != null && typeof entry === "object") {
    const identifier = (entry as Record<string, unknown>)[identifierField];
    if (typeof identifier === "string" && identifier.trim() !== "") {
      return identifier.trim();
    }
  }
  return `entry[${index}]`;
}

/**
 * Walks `schema` along `path` applying the unwrap table:
 *  - ZodEffects   → `_def.schema`
 *  - ZodPipeline  → `_def.out` (then `_def.in`)
 *  - ZodOptional / ZodNullable / ZodDefault → `_def.innerType`
 *  - ZodArray (numeric segment)  → `_def.type`
 *  - ZodObject (string-key segment) → `.shape[seg]`
 *
 * Wrappers are unwrapped greedily (without consuming a path segment) until a
 * structural node is reached; structural nodes consume one path segment.
 * Returns the node the path lands on, or `undefined` if the walk hits an
 * unexpected node (NEVER throws). Reaching `["links", 0, "kind"]` traverses the
 * `superRefine` ZodEffects → ZodArray → element ZodObject → `.shape.kind`.
 */
export function walkToField(
  schema: ZodNodeLike,
  path: (string | number)[],
): ZodNodeLike | undefined {
  let node: ZodNodeLike | undefined = schema;
  let i = 0;

  while (node != null) {
    const typeName = node._def?.typeName;

    // Greedy wrapper unwrapping (no path segment consumed).
    if (typeName === "ZodEffects") {
      node = node._def?.schema;
      continue;
    }
    if (typeName === "ZodPipeline") {
      // Prefer the output schema; fall back to the input schema.
      node = node._def?.out ?? node._def?.in;
      continue;
    }
    if (
      typeName === "ZodOptional" ||
      typeName === "ZodNullable" ||
      typeName === "ZodDefault"
    ) {
      node = node._def?.innerType;
      continue;
    }

    // Path exhausted: this is the field node.
    if (i >= path.length) return node;

    const segment = path[i];

    if (typeName === "ZodArray") {
      if (typeof segment !== "number") return undefined;
      node = node._def?.type;
      i += 1;
      continue;
    }
    if (typeName === "ZodObject") {
      if (typeof segment !== "string") return undefined;
      const shape = node.shape;
      if (shape == null) return undefined;
      node = shape[segment];
      i += 1;
      continue;
    }

    // Unexpected node type with path segments remaining → omit (do not throw).
    return undefined;
  }

  return undefined;
}

/**
 * Resolves the enum members for the failing field (contract item 5) by walking
 * the schema to the field node and reading its `ZodEnum._def.values`. Covers
 * both `invalid_enum_value` AND `invalid_type` on enum fields. Returns `[]` when
 * the field is not an enum or the walk fails (the member list is then omitted).
 */
export function formatEnumMembers(
  schema: ZodNodeLike,
  path: (string | number)[],
): string[] {
  const node = walkToField(schema, path);
  if (node == null) return [];
  // Unwrap any residual wrappers around the leaf (e.g. enum().optional()).
  let leaf: ZodNodeLike | undefined = node;
  while (leaf != null) {
    const typeName = leaf._def?.typeName;
    if (typeName === "ZodEnum") {
      return leaf._def?.values ?? [];
    }
    if (
      typeName === "ZodOptional" ||
      typeName === "ZodNullable" ||
      typeName === "ZodDefault"
    ) {
      leaf = leaf._def?.innerType;
      continue;
    }
    if (typeName === "ZodEffects") {
      leaf = leaf._def?.schema;
      continue;
    }
    return [];
  }
  return [];
}

/** Levenshtein distance — used by the did-you-mean nearest-key match. */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const row = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i += 1) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const temp = row[j];
      row[j] =
        a[i - 1] === b[j - 1]
          ? prev
          : Math.min(prev + 1, row[j] + 1, row[j - 1] + 1);
      prev = temp;
    }
  }
  return row[n];
}

/**
 * Finds the nearest valid key in `validKeys` to `strayKey`. Returns the closest
 * match (lowest edit distance, ties broken by declaration order), or undefined
 * when no key is reasonably close.
 */
function nearestKey(strayKey: string, validKeys: string[]): string | undefined {
  let best: string | undefined;
  let bestDistance = Infinity;
  for (const key of validKeys) {
    const distance = levenshtein(strayKey.toLowerCase(), key.toLowerCase());
    if (distance < bestDistance) {
      bestDistance = distance;
      best = key;
    }
  }
  // Only suggest if the keys are reasonably close (avoid nonsense suggestions).
  if (best === undefined) return undefined;
  const threshold = Math.max(2, Math.floor(Math.max(strayKey.length, best.length) / 2));
  return bestDistance <= threshold ? best : undefined;
}

/**
 * Returns the `.shape` keys of the ZodObject the issue's path resolves to (the
 * CORRECT object for an `unrecognized_keys` did-you-mean match). The path for an
 * `unrecognized_keys` issue points at the OBJECT itself, so we walk the whole
 * path. Returns `[]` when the resolved node is not a ZodObject.
 */
function objectShapeKeys(schema: ZodNodeLike, path: (string | number)[]): string[] {
  const node = walkToField(schema, path);
  let leaf: ZodNodeLike | undefined = node;
  while (leaf != null) {
    const typeName = leaf._def?.typeName;
    if (typeName === "ZodObject") {
      return leaf.shape ? Object.keys(leaf.shape) : [];
    }
    if (
      typeName === "ZodOptional" ||
      typeName === "ZodNullable" ||
      typeName === "ZodDefault"
    ) {
      leaf = leaf._def?.innerType;
      continue;
    }
    if (typeName === "ZodEffects") {
      leaf = leaf._def?.schema;
      continue;
    }
    return [];
  }
  return [];
}

/** Reads the offending value out of `entry` following `issue.path`. */
function valueAtPath(entry: unknown, path: (string | number)[]): unknown {
  let current: unknown = entry;
  for (const segment of path) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string | number, unknown>)[segment];
  }
  return current;
}

/**
 * Formats one contract line per ZodIssue (contract items 1–6). Returns an array
 * of strings — one per issue, each potentially multi-line when hints are
 * appended (each hint on its own `Hint: `-prefixed line).
 */
export function formatZodIssues(
  issues: ZodIssueLike[],
  context: FormatContext,
): string[] {
  const { basename, entry, index, schema } = context;
  const identifierField = basename.startsWith("contributions") ? "repo" : "title";

  return issues.map((issue) => {
    const locator = chooseLocator(issue, entry, index, identifierField);

    // unrecognized_keys: one stray-key line per key (item 4 — value — is skipped).
    if (issue.code === "unrecognized_keys") {
      const validKeys = objectShapeKeys(schema, issue.path);
      const fieldPrefix = buildFieldPath(issue.path);
      const parts = (issue.keys ?? []).map((strayKey) => {
        const suggestion = nearestKey(strayKey, validKeys);
        const keyPath = fieldPrefix === "" ? strayKey : `${fieldPrefix}.${strayKey}`;
        return suggestion
          ? `unknown key '${keyPath}' (did you mean '${suggestion}'?)`
          : `unknown key '${keyPath}'`;
      });
      const line = `${basename}: ${locator}: ${parts.join("; ")} - ${issue.message ?? ""}`.trimEnd();
      return appendHints(line, issue, context.hints);
    }

    const fieldPath = buildFieldPath(issue.path);
    const value = serializeValue(valueAtPath(entry, issue.path));

    let line = `${basename}: ${locator}: ${fieldPath} = ${value}`;
    if (issue.message) line += ` - ${issue.message}`;

    // Enum members (item 5): both invalid_enum_value and invalid_type on enums.
    if (issue.code === "invalid_enum_value" || issue.code === "invalid_type") {
      const members = formatEnumMembers(schema, issue.path);
      if (members.length > 0) {
        line += ` (${members.join(", ")})`;
      }
    }

    return appendHints(line, issue, context.hints);
  });
}

/**
 * Appends hints (contract item 6) as their own `Hint: `-prefixed lines, capped
 * at three per message.
 */
function appendHints(
  line: string,
  issue: ZodIssueLike,
  hintFn: FormatContext["hints"],
): string {
  if (!hintFn) return line;
  const hints = hintFn(issue).slice(0, 3);
  if (hints.length === 0) return line;
  return [line, ...hints.map((hint) => `Hint: ${hint}`)].join("\n");
}
