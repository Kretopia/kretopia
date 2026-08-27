import { render, screen, fireEvent } from "@testing-library/react";
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

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
    from: () => ({
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
    }),
    // analytics.ts's trackEvent() calls this when no explicit userId is
    // passed -- without it, every event fired during these tests (e.g. the
    // real new_room_opened call on mount) logs a swallowed-but-noisy error.
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "test-user-id" } }, error: null }) },
  },
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

  it("selecting a starter intent switches to text mode with the matching example pre-filled", () => {
    renderModal();
    fireEvent.click(screen.getByText("Photo Shoot"));
    const textarea = screen.getByPlaceholderText(/Editorial shoot|60-second product reel/i) as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();
    expect(textarea.value.length).toBeGreaterThan(0);
  });

  it("offers a text fallback entry point alongside voice", () => {
    renderModal();
    expect(screen.getByText("Or type it instead")).toBeInTheDocument();
  });
});
