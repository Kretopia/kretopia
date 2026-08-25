import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { StudioProjectsDashboard } from "../StudioProjectsDashboard";

const projects = [
  { id: "a", title: "Carnival Film", status: "active", updated_at: new Date().toISOString(), client_name: "Spice House" },
  { id: "b", title: "Album Rollout", status: "completed", updated_at: new Date().toISOString(), client_name: null },
];

const renderDash = (props: Partial<React.ComponentProps<typeof StudioProjectsDashboard>> = {}) =>
  render(
    <MemoryRouter>
      <StudioProjectsDashboard
        projects={projects as any}
        invoicesByProject={{ a: "invoiced", b: "unsent" }}
        onCreate={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  );

describe("StudioProjectsDashboard", () => {
  it("uses Projects terminology and never says 'Loose'", () => {
    const { container } = renderDash();
    expect(screen.getByRole("heading", { name: "Projects" })).toBeInTheDocument();
    expect(container.textContent?.toLowerCase()).not.toContain("loose");
  });

  it("renders both projects with a next action", () => {
    renderDash();
    expect(screen.getByText("Carnival Film")).toBeInTheDocument();
    expect(screen.getByText("Album Rollout")).toBeInTheDocument();
    expect(screen.getAllByText(/^Next:/).length).toBe(2);
  });

  it("filters via the summary tiles", () => {
    renderDash();
    fireEvent.click(screen.getByRole("button", { name: "Filter by In progress" }));
    expect(screen.getByText("Carnival Film")).toBeInTheDocument();
    expect(screen.queryByText("Album Rollout")).not.toBeInTheDocument();
  });

  it("searches by title", () => {
    renderDash();
    fireEvent.change(screen.getByLabelText("Search Projects"), { target: { value: "album" } });
    expect(screen.queryByText("Carnival Film")).not.toBeInTheDocument();
    expect(screen.getByText("Album Rollout")).toBeInTheDocument();
  });

  it("hides every money signal when the viewer may not see money", () => {
    const { container } = renderDash({ canSeeMoney: false });
    expect(container.textContent).not.toContain("Awaiting payment");
    expect(container.textContent).not.toContain("Invoiced");
    expect(container.textContent).not.toContain("Draft the invoice");
  });

  it("gates money per-project when moneyVisibleByProject is provided, not globally", () => {
    // "a" (Carnival Film) is owner-visible, "b" (Album Rollout) is not --
    // this is the real shape of a viewer's dashboard mixing roles across
    // Projects, which a single canSeeMoney boolean can't express.
    renderDash({ canSeeMoney: true, moneyVisibleByProject: { a: true, b: false } });
    const carnivalRow = screen.getByText("Carnival Film").closest("li")!;
    const albumRow = screen.getByText("Album Rollout").closest("li")!;
    expect(carnivalRow.textContent).toContain("Invoiced");
    expect(albumRow.textContent).not.toContain("No invoice");
    expect(albumRow.textContent).not.toContain("Invoiced");
  });

  it("treats a project missing from moneyVisibleByProject as not visible (fails closed)", () => {
    renderDash({ moneyVisibleByProject: { a: true } }); // "b" intentionally absent
    const albumRow = screen.getByText("Album Rollout").closest("li")!;
    expect(albumRow.textContent).not.toContain("No invoice");
    expect(albumRow.textContent).toContain("Review the delivery");
  });

  it("shows a creation-led empty state with no dead end", () => {
    renderDash({ projects: [] });
    expect(screen.getByText("No Projects yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create your first Project/i })).toBeInTheDocument();
  });

  it("renders loading and error states", () => {
    renderDash({ loading: true });
    expect(screen.getByText(/Loading your Projects/)).toBeInTheDocument();
    renderDash({ error: "network down" });
    expect(screen.getByRole("alert")).toHaveTextContent("network down");
  });
});
