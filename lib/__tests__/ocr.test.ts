// lib/__tests__/ocr.test.ts
jest.mock("../ocr/vision", () => ({ runVisionOcr: jest.fn() }));

import { parseScheduleImage } from "../ocr";
import { runVisionOcr } from "../ocr/vision";

const mockVision = runVisionOcr as jest.Mock;

describe("parseScheduleImage", () => {
  afterEach(() => jest.clearAllMocks());

  test("returns resolved shifts from the vision engine", async () => {
    mockVision.mockResolvedValue({
      weekStart: "2026-05-03",
      shifts: [
        {
          dayOfWeek: "Monday",
          date: "2026-05-04",
          startTime: "5:00 AM",
          endTime: "2:00 PM",
          department: "Deli",
        },
      ],
    });
    const result = await parseScheduleImage("base64", "image/png");
    expect(result.source).toBe("vision");
    expect(result.weekStart).toBe("2026-05-03");
    expect(result.shifts).toHaveLength(1);
    expect(result.shifts[0].date).toBe("2026-05-04");
    expect(result.shifts[0].allDay).toBe(false);
  });

  test("marks marker-only shifts (no times) as allDay with sentinels", async () => {
    mockVision.mockResolvedValue({
      weekStart: "2026-05-01",
      shifts: [{ dayOfWeek: "Saturday", date: "2026-05-09" }],
    });
    const result = await parseScheduleImage("base64", "image/png");
    expect(result.shifts[0].allDay).toBe(true);
    expect(result.shifts[0].startTime).toBe("12:00 AM");
    expect(result.shifts[0].endTime).toBe("11:59 PM");
  });

  test("throws when the engine finds no shifts", async () => {
    mockVision.mockResolvedValue({ shifts: [] });
    await expect(parseScheduleImage("base64", "image/png")).rejects.toThrow(
      "No shifts found"
    );
  });

  test("falls back to today's Saturday when weekStart is missing", async () => {
    mockVision.mockResolvedValue({
      shifts: [{ dayOfWeek: "Monday", startTime: "9:00 AM", endTime: "5:00 PM" }],
    });
    const result = await parseScheduleImage("base64", "image/png");
    expect(result.weekStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
