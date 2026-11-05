import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EmptyState, ErrorState } from "../src/components/ui";

describe("UI primitives", () => {
  it("renders an empty state with its heading and description", () => {
    const markup = renderToStaticMarkup(
      <EmptyState title="No stays found" description="Try different dates." />,
    );

    expect(markup).toContain("No stays found");
    expect(markup).toContain("Try different dates.");
  });

  it("marks an error state for assistive technology", () => {
    const markup = renderToStaticMarkup(
      <ErrorState title="Unable to load" description="Please try again." />,
    );

    expect(markup).toContain('role="alert"');
  });
});
