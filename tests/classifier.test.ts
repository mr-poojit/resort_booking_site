import { afterEach, describe, expect, it, vi } from "vitest";
import {
  classifyWithFallback,
  LlmClassifier,
  maskContactDetails,
} from "../src/server/classifier";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("optional hosted classifier", () => {
  it("masks phone numbers and emails before model submission", () => {
    expect(
      maskContactDetails("Call +91 98765 43210 or email guest@example.test"),
    ).toBe("Call [phone] or email [email]");
  });

  it("uses deterministic rules when the provider is not configured", async () => {
    vi.stubEnv("LLM_PROVIDER", "");
    vi.stubEnv("LLM_API_KEY", "");
    const result = await classifyWithFallback(
      "Is a villa available for a two-night stay?",
    );
    expect(result.category).toBe("ROOM_BOOKING");
    expect(result.modelVersion).toBe("rules-v1");
  });

  it("validates model JSON and sends masked text without giving the model tools", async () => {
    vi.stubEnv("LLM_PROVIDER", "openai-compatible");
    vi.stubEnv("LLM_API_URL", "https://model.example.test/v1/chat/completions");
    vi.stubEnv("LLM_API_KEY", "test-key");
    vi.stubEnv("LLM_MODEL", "test-model");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  category: "WEDDING",
                  confidence: 0.91,
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await new LlmClassifier().classify(
      "Wedding enquiry from guest@example.test, call +91 98765 43210",
    );
    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);

    expect(result.category).toBe("WEDDING");
    expect(result.modelVersion).toBe("test-model");
    expect(requestBody.messages[1].content).not.toContain("guest@example.test");
    expect(requestBody.messages[1].content).not.toContain("98765");
    expect(requestBody.tools).toBeUndefined();
  });

  it("falls back to rules when the hosted response is invalid", async () => {
    vi.stubEnv("LLM_PROVIDER", "openai-compatible");
    vi.stubEnv("LLM_API_URL", "https://model.example.test/v1/chat/completions");
    vi.stubEnv("LLM_API_KEY", "test-key");
    vi.stubEnv("LLM_MODEL", "test-model");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ choices: [{ message: { content: "not-json" } }] }),
          {
            status: 200,
          },
        ),
      ),
    );

    const result = await classifyWithFallback(
      "Is a villa available for a two-night stay?",
    );
    expect(result.category).toBe("ROOM_BOOKING");
    expect(result.modelVersion).toBe("rules-v1");
  });
});
