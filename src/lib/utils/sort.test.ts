import { describe, expect, it } from "vitest";
import { moveEntry, nextSortOrder, sortByOrder, toSortOrderPayload } from "./sort";

describe("sortByOrder", () => {
  it("orders by sortOrder and falls back to id", () => {
    const rows = [
      { id: 3, sortOrder: 1 },
      { id: 1, sortOrder: 0 },
      { id: 2, sortOrder: 1 },
    ];
    expect(sortByOrder(rows).map((row) => row.id)).toEqual([1, 2, 3]);
  });

  it("does not mutate the input", () => {
    const rows = [
      { id: 2, sortOrder: 1 },
      { id: 1, sortOrder: 0 },
    ];
    sortByOrder(rows);
    expect(rows.map((row) => row.id)).toEqual([2, 1]);
  });
});

describe("moveEntry", () => {
  it("moves an entry down", () => {
    expect(moveEntry(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
  });

  it("moves an entry up", () => {
    expect(moveEntry(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  });

  it("returns the list unchanged for an out-of-range index", () => {
    expect(moveEntry(["a", "b"], 5, 0)).toEqual(["a", "b"]);
  });
});

describe("toSortOrderPayload", () => {
  it("renumbers densely from zero", () => {
    expect(toSortOrderPayload([8, 3, 5])).toEqual([
      { id: 8, sortOrder: 0 },
      { id: 3, sortOrder: 1 },
      { id: 5, sortOrder: 2 },
    ]);
  });
});

describe("nextSortOrder", () => {
  it("appends after the current maximum", () => {
    expect(
      nextSortOrder([
        { id: 1, sortOrder: 0 },
        { id: 2, sortOrder: 4 },
      ]),
    ).toBe(5);
  });

  it("starts at zero for an empty list", () => {
    expect(nextSortOrder([])).toBe(0);
  });
});
