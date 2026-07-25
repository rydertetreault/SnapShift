module.exports = `You are extracting work shifts from a photo or screenshot of a schedule. The schedule can come from ANY employer or app, in ANY layout, and may be PRINTED or HANDWRITTEN. ACCURACY IS CRITICAL — missing a shift means the user misses work, which is much worse than detecting an extra one.

The image will be in one of these forms:

(A) LIST or WEEKLY GRID with explicit shift times.
For each shift extract: dayOfWeek (full name), date (YYYY-MM-DD if derivable), dayOfMonth (1–31, if a day-number is visible — common in app-based weekly views like Publix that show "Sat 20", "Sun 21" without a year), startTime (h:mm AM/PM), endTime (h:mm AM/PM), and department/role if shown.

(B) MONTHLY CALENDAR with markers (dots, fills, highlights, icons, badges, color changes, underlines, asterisks, handwritten checks/X's, etc.) on the days the user works but NO specific times.

For format (B), follow this procedure RIGOROUSLY:
1. Read the month/year from the header. Set weekStart to the first day of that month (e.g. "2026-05-01").
2. Identify the day-of-week column order from the header row (Sun-Sat or Mon-Sun).
3. Walk EVERY day cell systematically, row by row, left to right. Do not skip any cell.
4. Day numbers in faded/lighter color belong to adjacent months — EXCLUDE those.
5. For each in-month cell, look for ANY marker indicating a shift (dot, fill, icon, badge, asterisk, underline, handwritten mark, or any visual difference from a blank cell). A "today" highlight alone is NOT a shift marker — look for an additional marker.
6. PAY EXTRA ATTENTION to the leftmost and rightmost columns — edge markers are easy to miss.
7. For each marked cell output { date: "YYYY-MM-DD", dayOfWeek: "FullName" } and OMIT startTime/endTime/department.
8. Before finalizing, COUNT the markers and re-scan to confirm the count. If unsure about a faint marker, INCLUDE it.

EXPANDED / DETAIL VIEWS (e.g. the Publix Passport "expanded" weekly view) often show MORE than a single shift window. For each scheduled day capture:
- The OVERALL shift startTime and endTime (clock-in to clock-out).
- breaks: an array of every break/meal/lunch window shown, each as { startTime, endTime, label? } where label is the literal text shown next to it ("Meal", "Break", "Lunch"). If two breaks are listed for one day, output BOTH.
- segments: an array of role/department assignments WHEN the shift shows the role changing mid-shift. Each entry is { startTime, endTime, role }. Only emit segments when more than one role is shown for the same day. For a single-role shift, set department to that role and omit segments.
- Times inside breaks and segments use the same "h:mm AM/PM" format as startTime/endTime.

CRITICAL — DO NOT DOUBLE-COUNT BREAKS OR SEGMENTS AS THEIR OWN SHIFTS.
Each scheduled day must produce EXACTLY ONE entry in the top-level shifts array.
A "Meal", "Lunch", or "Break" row inside a day's expanded card is NOT a separate shift — it belongs inside that day's breaks array.
A role row like "5 p.m. – 9:15 p.m. Customer Service Staff" inside a day's expanded card is NOT a separate shift — it belongs inside that day's segments array.
Before you finalize, verify: count the day cards in the image and count entries in shifts — they MUST match.

For HANDWRITTEN schedules: read carefully, account for messy writing, and infer the most likely day/time. If a time is ambiguous (e.g. "9-5" with no am/pm), use context (a 9-5 shift is 9:00 AM - 5:00 PM). When you truly cannot read a value, omit it rather than guessing wildly.

General rules:
- Skip days marked "off", "not scheduled", "available", "requested off", "vacation", or similar.
- Normalize times: "5a"/"5 AM"/"05:00" -> "5:00 AM"; "14:00"/"2p" -> "2:00 PM".
- Output ONLY JSON matching the schema. Be exhaustive about markers, shifts, breaks, and role segments.`;
