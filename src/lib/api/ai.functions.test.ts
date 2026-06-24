import { describe, it, expect } from "vitest";
import { z } from "zod";

const Input = z.object({ text: z.string().min(20).max(60000) });

describe("AI Validators", () => {
  it("should validate a proper resume text payload", () => {
    const validText = "This is a valid resume text that is longer than twenty characters.";
    expect(() => Input.parse({ text: validText })).not.toThrow();
  });

  it("should throw on short text", () => {
    expect(() => Input.parse({ text: "Too short" })).toThrow();
  });

  it("should throw on missing text", () => {
    expect(() => Input.parse({})).toThrow();
  });
});
