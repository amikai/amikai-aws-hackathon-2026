import { describe, it, expect } from "vitest";
import { MAIN_ORDER } from "../src/types";

describe("project scaffold", () => {
  it("exposes the 7-step main order", () => {
    expect(MAIN_ORDER).toEqual(["ground", "plan", "radio", "feet", "scale", "reflect", "diary"]);
  });
});
