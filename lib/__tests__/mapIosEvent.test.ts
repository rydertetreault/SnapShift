import { mapIosEventToScheduleEvent } from "../calendar/mapIosEvent";

const calType = (id: string) =>
  ({ holidays: "subscribed", birthdays: "birthdays", personal: "local" } as Record<string, string>)[id];

const raw = (over: any = {}) => ({
  id: "e1",
  calendarId: "personal",
  title: "Dentist",
  startDate: "2026-06-09T09:00:00.000Z",
  endDate: "2026-06-09T10:00:00.000Z",
  allDay: false,
  ...over,
});

describe("mapIosEventToScheduleEvent", () => {
  test("marks subscribed for holiday calendar", () => {
    const out = mapIosEventToScheduleEvent(raw({ calendarId: "holidays", allDay: true }), calType);
    expect(out.subscribed).toBe(true);
    expect(out.allDay).toBe(true);
  });
  test("marks subscribed for birthday calendar", () => {
    const out = mapIosEventToScheduleEvent(raw({ calendarId: "birthdays", allDay: true }), calType);
    expect(out.subscribed).toBe(true);
  });
  test("not subscribed for a personal calendar", () => {
    expect(mapIosEventToScheduleEvent(raw(), calType).subscribed).toBe(false);
  });
  test("maps core fields", () => {
    const out = mapIosEventToScheduleEvent(raw(), calType);
    expect(out).toMatchObject({
      id: "ios:e1",
      source: "ios",
      category: "other",
      title: "Dentist",
      date: "2026-06-09",
      iosCalendarId: "personal",
    });
  });
});
