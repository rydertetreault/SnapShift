// lib/colors/rules.ts
// Title-based color rules. The user picks a color "for all events titled X"
// (and optionally "from this specific calendar"). When an event renders, the
// most specific matching rule wins — see ./resolve.ts for the precedence.
//
// Rules are persisted in AsyncStorage and exposed via a tiny pub/sub so
// renderers can re-resolve on change without a context provider.
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@snapshift/color-rules";

export interface ColorRule {
  id: string; // local-only, used for edit/delete
  matchTitle: string; // exact title match (case-insensitive, trimmed)
  matchCalendarId?: string; // when set, also restrict to this iOS calendar id
  color: string;
  createdAt: string;
}

export async function getColorRules(): Promise<ColorRule[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function write(rules: ColorRule[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(rules));
  emit();
}

function randomId(): string {
  return Array.from({ length: 10 }, () =>
    "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]
  ).join("");
}

function normTitle(t: string): string {
  return t.trim().toLowerCase();
}

/**
 * Upsert a rule by (matchTitle, matchCalendarId). Color-changing the same
 * title twice replaces the existing rule rather than stacking.
 */
export async function setColorRule(input: {
  matchTitle: string;
  matchCalendarId?: string;
  color: string;
}): Promise<ColorRule> {
  const rules = await getColorRules();
  const matchTitle = input.matchTitle.trim();
  if (!matchTitle) throw new Error("matchTitle cannot be empty");
  const key = normTitle(matchTitle);
  const existing = rules.find(
    (r) =>
      normTitle(r.matchTitle) === key &&
      (r.matchCalendarId ?? "") === (input.matchCalendarId ?? "")
  );
  const rule: ColorRule = {
    id: existing?.id ?? randomId(),
    matchTitle,
    matchCalendarId: input.matchCalendarId,
    color: input.color,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  const next = existing
    ? rules.map((r) => (r.id === existing.id ? rule : r))
    : [...rules, rule];
  await write(next);
  return rule;
}

export async function removeColorRule(id: string): Promise<void> {
  const rules = await getColorRules();
  await write(rules.filter((r) => r.id !== id));
}

/**
 * Find the best-matching rule for an event. Precedence:
 *   1. Exact title + matching calendar id  (most specific)
 *   2. Exact title only                    (any calendar)
 * Returns null when nothing matches.
 */
export function findMatchingRule(
  rules: ColorRule[],
  ctx: { title: string; iosCalendarId?: string }
): ColorRule | null {
  const key = normTitle(ctx.title);
  let titleOnly: ColorRule | null = null;
  for (const r of rules) {
    if (normTitle(r.matchTitle) !== key) continue;
    if (r.matchCalendarId && ctx.iosCalendarId && r.matchCalendarId === ctx.iosCalendarId) {
      return r; // most specific
    }
    if (!r.matchCalendarId && !titleOnly) {
      titleOnly = r;
    }
  }
  return titleOnly;
}

// --- Tiny pub/sub so UI re-resolves colors after a rule change. -------------
type Listener = () => void;
const listeners = new Set<Listener>();
function emit() { listeners.forEach((l) => l()); }
export function subscribeColorRules(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
