import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { KretoTip } from "../KretoTip";

/**
 * Regression coverage for Kreto's controlled rollout across KretoTip's
 * route groups (KRETO_3D_REFERENCE_AND_RIGHTS_AUDIT.md §13): Studio shipped
 * in the pilot, Scout is the first rollout surface approved after pilot
 * review. This guards that the embodied presence only appears on the
 * approved route groups and every other group still renders the flat
 * KretoMark unchanged -- a rollout to "everywhere at once" would be exactly
 * the regression this suite exists to catch.
 */

function renderTip(surface: "today" | "discover" | "desk" | "match" | "pay" | "passport") {
  return render(
    <MemoryRouter>
      <KretoTip surface={surface} />
    </MemoryRouter>,
  );
}

describe("KretoTip — Kreto presence rollout scope", () => {
  it("Studio (desk) renders the embodied KretoPresence, not the flat KretoMark", () => {
    const { container } = renderTip("desk");
    expect(container.querySelector('svg[viewBox="0 0 100 100"]')).toBeInTheDocument();
    expect(screen.getByText(/Kreto · Studio/i)).toBeInTheDocument();
  });

  it("Scout (discover) renders the embodied KretoPresence -- the first rollout surface", () => {
    const { container } = renderTip("discover");
    expect(container.querySelector('svg[viewBox="0 0 100 100"]')).toBeInTheDocument();
    expect(screen.getByText(/Kreto · Scout/i)).toBeInTheDocument();
  });

  it.each(["today", "match", "pay", "passport"] as const)(
    "%s still renders the flat KretoMark, not the embodied presence -- rollout is scoped, not global",
    (surface) => {
      const { container } = renderTip(surface);
      expect(container.querySelector('svg[viewBox="0 0 100 100"]')).not.toBeInTheDocument();
      expect(container.querySelector("img")).toBeInTheDocument();
    },
  );
});
