// lib/colors/resolve.ts
// Single resolver that the renderers call to pick the correct color for an
// event. Precedence (highest → lowest):
//   1. Title + iOS calendar id rule
//   2. Title-only rule
//   3. Per-iOS-calendar default color
//   4. Category color (existing per-category override system)
// Shared-person overlay colors are NOT in this resolver — they're applied at
// the overlay layer where we already have the SharedPerson reference.
import { ScheduleEvent } from "../types";
import { CategoryOverrides, resolveCategory } from "../preferences/categories";
import { ColorRule, findMatchingRule } from "./rules";
import { CalendarColorMap } from "./calendarDefaults";

export interface ColorContext {
  rules: ColorRule[];
  calendarDefaults: CalendarColorMap;
  categoryOverrides: CategoryOverrides;
}

/**
 * Returns the rendering color + the matching rule (if any) so the UI can
 * indicate "this color came from a rule" affordance if it wants. The name
 * field is the category display name, kept for back-compat with callers that
 * used resolveCategory().
 */
export function resolveEventColor(
  event: ScheduleEvent,
  ctx: ColorContext
): { color: string; name: string; ruleId?: string } {
  const rule = findMatchingRule(ctx.rules, {
    title: event.title,
    iosCalendarId: event.iosCalendarId,
  });
  const categoryInfo = resolveCategory(event.category, ctx.categoryOverrides);
  if (rule) {
    return { color: rule.color, name: categoryInfo.name, ruleId: rule.id };
  }
  if (event.source === "ios" && event.iosCalendarId) {
    const def = ctx.calendarDefaults[event.iosCalendarId];
    if (def) return { color: def, name: categoryInfo.name };
  }
  return categoryInfo;
}
