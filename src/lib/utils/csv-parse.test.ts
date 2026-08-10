import { describe, expect, it } from "vitest";
import { parseCsv, rowsToObjects } from "@/lib/utils/csv-parse";

describe("csv parse", () => {
  it("parses quoted commas and maps headers", () => {
    const csv = `name,email,techstack\n"Doe, Jane",jane@example.com,"React, Node"\n`;
    const rows = parseCsv(csv);
    expect(rows[0]).toEqual(["name", "email", "techstack"]);
    expect(rows[1][0]).toBe("Doe, Jane");
    const objects = rowsToObjects(rows);
    expect(objects[0].email).toBe("jane@example.com");
    expect(objects[0].techstack).toBe("React, Node");
  });
});
