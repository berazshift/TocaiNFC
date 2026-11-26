import { describe, expect, it } from "vitest";
import { startsEmpty } from "./account";

describe("new account on a shared device", () => {
  it("starts empty when another account used this device before", () => {
    expect(startsEmpty("user-a", "user-b")).toBe(true);
  });
  it("keeps the device data when it belongs to the same account", () => {
    expect(startsEmpty("user-a", "user-a")).toBe(false);
  });
  it("keeps data created before accounts existed", () => {
    expect(startsEmpty(null, "user-a")).toBe(false);
  });
});
