import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { VoiceFirstCreateModal } from "../VoiceFirstCreateModal";

/**
 * Regression coverage for New Room's accessibility contract (NEW_ROOM_UX_AUDIT.md
 * §7): this is a hand-rolled full-screen overlay, not a Radix Dialog, so none
 * of focus trap / focus return / aria-labelledby come for free -- these tests
 * guard the behavior added to close that gap, plus the core prompt-mode
 * structure (starter intents, input mode entry points) the rest of the flow
 * depends on. Voice recording, file upload and the extract-brief round trip
 * are not exercised here (no MediaRecorder/getUserMedia in jsdom, and the
 * network call is a separate concern) -- see NEW_ROOM_RELEASE_GATE.md for
 * what browser verification covered instead.
 */

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(() => Promise.resolve({
    data: {
      project: { title: "Test Project", summary: "A test brief." },
      deliverables: [{ title: "First task", description: "" }],
    },
    error: null,
  })),
  projectsInsert: vi.fn(() => ({
    select: () => ({ single: () => Promise.resolve({ data: { id: "new-project-id" }, error: null }) }),
  })),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: mocks.invoke },
    from: (table: string) => ({
      insert: table === "projects" ? mocks.projectsInsert : vi.fn(() => Promise.resolve({ data: null, error: null })),
    }),
    // analytics.ts's trackEvent() calls this when no explicit userId is
    // passed -- without it, every event fired during these tests (e.g. the
    // real new_room_opened call on mount) logs a swallowed-but-noisy error.
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "test-user-id" } }, error: null }) },
  },
}));

vi.mock("@/lib/scaffoldProject", () => ({
  scaffoldProjectDefaults: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "test-user-id" }, session: null, loading: false }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// extractBriefDocument.ts pulls in pdfjs-dist at module scope, which needs
// DOMMatrix -- a real browser Canvas API jsdom doesn't provide. None of these
// tests touch file upload, so a lightweight mock avoids that environment gap
// entirely rather than polyfilling a Canvas API the suite doesn't need.
vi.mock("@/lib/extractBriefDocument", () => ({
  compressImage: vi.fn(async () => ({ base64: "", mime: "image/jpeg" })),
}));

function renderModal(props: Partial<React.ComponentProps<typeof VoiceFirstCreateModal>> = {}) {
  const onOpenChange = vi.fn();
  const onCreated = vi.fn();
  const utils = render(
    <MemoryRouter>
      <VoiceFirstCreateModal open onOpenChange={onOpenChange} onCreated={onCreated} {...props} />
    </MemoryRouter>,
  );
  return { ...utils, onOpenChange, onCreated };
}

describe("VoiceFirstCreateModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when closed", () => {
    render(
      <MemoryRouter>
        <VoiceFirstCreateModal open={false} onOpenChange={vi.fn()} onCreated={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.queryByText("What are you making?")).not.toBeInTheDocument();
  });

  it("renders the prompt-mode heading, trust line and starter intents when open", () => {
    renderModal();
    expect(screen.getByText("What are you making?")).toBeInTheDocument();
    expect(screen.getByText(/Nothing becomes a Project until you confirm the draft/)).toBeInTheDocument();
    expect(screen.getByText("Examples to get you started")).toBeInTheDocument();
    // A real, mapped WorkspaceType label from workspaceConfigs.ts, not a stub string.
    expect(screen.getByText("Photo Shoot")).toBeInTheDocument();
  });

  it("exposes a real dialog role labelled by the visible New Room title, not a duplicated static string", () => {
    renderModal();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    const labelledBy = dialog.getAttribute("aria-labelledby");
    expect(labelledBy).toBe("new-room-title");
    const labelEl = document.getElementById(labelledBy!);
    expect(labelEl).not.toBeNull();
    expect(labelEl).toHaveTextContent("New Room");
  });

  it("closes on Escape", () => {
    const { onOpenChange } = renderModal();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes when the close button is clicked", () => {
    const { onOpenChange } = renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("moves initial focus to the close button", () => {
    renderModal();
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  });

  it("selecting a starter intent fills the always-visible composer with the matching example", () => {
    renderModal();
    fireEvent.click(screen.getByText("Photo Shoot"));
    const input = screen.getByLabelText("Describe your project to Kreto") as HTMLInputElement;
    expect(input.value.length).toBeGreaterThan(0);
    expect(input.value).toMatch(/Editorial shoot/i);
  });

  it("the Kreto composer is the primary entry point, always visible with no mode toggle needed", () => {
    renderModal();
    // Text entry is not hidden behind a "type it instead" click, and voice
    // is a secondary icon inside the same bar rather than a separate screen.
    expect(screen.getByLabelText("Describe your project to Kreto")).toBeInTheDocument();
    expect(screen.getByLabelText("Describe it by voice instead")).toBeInTheDocument();
    expect(screen.queryByText("Or type it instead")).not.toBeInTheDocument();
  });

  it("creates exactly one project even if Create is double-clicked", async () => {
    renderModal();
    fireEvent.click(screen.getByText("Photo Shoot"));
    const input = screen.getByLabelText("Describe your project to Kreto");
    fireEvent.change(input, { target: { value: "A real editorial shoot brief for testing." } });
    fireEvent.click(screen.getByLabelText("Send to Kreto"));

    await screen.findByText("Kreto structured your project — review and edit", {}, { timeout: 3000 });
    // The "Money involved?" gate is required -- both Create buttons stay
    // disabled until it's answered, same as in the real app.
    fireEvent.click(screen.getByText("No — personal/passion"));

    const createButton = screen.getByText("Create all & open");

    // Two rapid clicks simulate the double-click/double-tap race a plain
    // `creating` state boolean can't fully close (state updates lag a
    // render behind the click handler) -- the synchronous creatingRef
    // guard in createProject() is what this test actually verifies.
    fireEvent.click(createButton);
    fireEvent.click(createButton);

    await waitFor(() => expect(mocks.projectsInsert).toHaveBeenCalled());
    expect(mocks.projectsInsert).toHaveBeenCalledTimes(1);
  });
});
