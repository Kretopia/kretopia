import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { KretoCharacter } from "../KretoCharacter";

let reducedMotion = false;
vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => reducedMotion,
}));

describe("KretoCharacter", () => {
  it("is decorative (aria-hidden), never a control", () => {
    const { container } = render(<KretoCharacter />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders each of the five real variants with a distinct accessible name", () => {
    const variants = ["main", "scout", "connector", "producer", "publicist"] as const;
    const names = ["Kreto", "Kreto — Scout", "Kreto — Connector", "Kreto — Producer", "Kreto — Publicist"];
    variants.forEach((variant, i) => {
      const { container } = render(<KretoCharacter variant={variant} />);
      expect(container.querySelector(".sr-only")).toHaveTextContent(names[i]);
    });
  });

  it("shows no status badge and no extra announcement when idle", () => {
    const { container } = render(<KretoCharacter state="idle" />);
    expect(container.querySelector("[aria-hidden] > span:not(.sr-only)")).toBeNull();
    expect(container.querySelector(".sr-only")).toHaveTextContent("Kreto");
  });

  it("pairs a visible-adjacent state badge with the same real sr-only text KretoPresence uses", () => {
    const { container } = render(<KretoCharacter state="processing" />);
    expect(container.querySelector(".sr-only")).toHaveTextContent("Kreto is working on this");
  });

  it("does not throw under reduced motion", () => {
    reducedMotion = true;
    expect(() => render(<KretoCharacter />)).not.toThrow();
    reducedMotion = false;
  });
});
