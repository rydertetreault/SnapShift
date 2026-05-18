import AsyncStorage from "@react-native-async-storage/async-storage";
import { maybeExtendIndefiniteSeries } from "../seriesMaintenance";
import { STORAGE_KEY } from "../constants";
import { ScheduleEvent } from "../types";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

beforeEach(async () => {
  await AsyncStorage.clear();
});

test("extends an indefinite series when within threshold", async () => {
  const today = new Date("2026-05-18");
  // Create a weekly series whose last occurrence is 30 days from today (< 60 threshold)
  const series: ScheduleEvent[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date("2026-04-01");
    d.setDate(d.getDate() + i * 7);
    const iso = d.toISOString().slice(0, 10);
    series.push({
      id: `e${i}`,
      title: "Standup",
      date: iso,
      startTime: `${iso}T09:00:00`,
      endTime: `${iso}T09:30:00`,
      category: "meeting",
      source: "manual",
      createdAt: "2026-04-01T00:00:00",
      seriesId: "S1",
      recurrence: { frequency: "weekly" },
    });
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(series));

  const added = await maybeExtendIndefiniteSeries(today);
  expect(added).toBeGreaterThan(0);
});

test("does nothing when last occurrence is far in the future", async () => {
  const today = new Date("2026-05-18");
  const farFuture = "2027-05-18";
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([{
    id: "e1",
    title: "Standup",
    date: farFuture,
    startTime: `${farFuture}T09:00:00`,
    endTime: `${farFuture}T09:30:00`,
    category: "meeting",
    source: "manual",
    createdAt: "2026-04-01T00:00:00",
    seriesId: "S1",
    recurrence: { frequency: "weekly" },
  }]));

  const added = await maybeExtendIndefiniteSeries(today);
  expect(added).toBe(0);
});
