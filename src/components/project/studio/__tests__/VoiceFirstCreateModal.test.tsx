import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { VoiceFirstCreateModal } from "../VoiceFirstCreateModal";

/**
 * Regression coverage for New Room's accessibility contract (NEW_ROOM_UX_AUDIT.md
 * §7): this is a hand-rolled full-screen overlay, not a Radix Dialog, so none
 * of focus trap / focus return / aria-labelledby come for free -- these tests
 * guard the behavior added to close that gap, plus the core prompt-mode
 * structure (starter intents, input mode entry points) the rest of the flow
 * depends on.
 *
 * Also covers the Kreto embodied-presence state mapping approved in
 * KRETO_NEW_ROOM_STATE_MAPPING_AUDIT.md: idle/attentive/listening/processing/
 * caution/proposal_ready/error, each tied to a real trigger, never a fake
 * one. `KretoPresence` itself is mocked to a thin `data-state` stub -- its
 * own rendering (SVG, sr-only text per state) is already covered by
 * KretoPresence.test.tsx; what this file verifies is that the *right* state
 * gets computed and passed down for the *real* condition in this modal.
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
  toast: vi.fn(),
  navigate: vi.fn(),
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
  useToast: () => ({ toast: mocks.toast }),
}));

// extractBriefDocument.ts pulls in pdfjs-dist at module scope, which needs
// DOMMatrix -- a real browser Canvas API jsdom doesn't provide. None of these
// tests touch file upload, so a lightweight mock avoids that environment gap
// entirely rather than polyfilling a Canvas API the suite doesn't need.
vi.mock("@/lib/extractBriefDocument", () => ({
  compressImage: vi.fn(async () => ({ base64: "", mime: "image/jpeg" })),
}));

// Only useNavigate is overridden (to capture its call args, notably the
// route `state` the Studio success acknowledgement depends on) -- everything
// else, including MemoryRouter and real route matching, is untouched.
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mocks.navigate };
});

// KretoPresence's own rendering (SVG, sr-only announcements per state) is
// covered by its own test suite -- this file only needs to know which
// `state` VoiceFirstCreateModal computed and passed down for a given real
// condition, so a thin stub keeps these tests fast and decoupled.
vi.mock("@/components/brand/KretoPresence", () => ({
  KretoPresence: ({ state, size }: { state?: string; size?: string }) => (
    <div data-testid="kreto-presence" data-state={state} data-size={size} />
  ),
}));

class MockMediaRecorder {
  static instances: MockMediaRecorder[] = [];
  state: "recording" | "inactive" = "recording";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(public stream: unknown) {
    MockMediaRecorder.instances.push(this);
  }
  start() {}
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["fake-audio"], { type: "audio/webm" }) });
    this.onstop?.();
  }
}

function stubMicPermission(behavior: "grant" | "deny") {
  Object.defineProperty(navigator, "mediaDevices", {
    value: {
      getUserMedia:
        behavior === "grant"
          ? vi.fn(() => Promise.resolve({ getTracks: () => [{ stop: vi.fn() }] }))
          : vi.fn(() => Promise.reject(new Error("Permission denied"))),
    },
    configurable: true,
  });
}

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
    MockMediaRecorder.instances.length = 0;
    vi.stubGlobal("MediaRecorder", MockMediaRecorder);
    stubMicPermission("grant");
    // The real draft-persistence feature (VoiceFirstCreateModal.tsx's own
    // `new_room_draft:<userId>` sessionStorage key) survives across tests in
    // this file since every test shares the same mocked user id and jsdom
    // doesn't reset storage between tests on its own -- without this, a
    // test that reaches "review" leaves a draft that the next renderModal()
    // rehydrates instead of starting fresh at "prompt".
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
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

  describe("Kreto embodied presence — state mapping", () => {
    it("is idle when New Room first opens, with nothing typed or focused", () => {
      renderModal();
      expect(screen.getByTestId("kreto-presence")).toHaveAttribute("data-state", "idle");
    });

    it("is attentive only while the composer is genuinely focused, and drops back to idle on blur", () => {
      renderModal();
      const input = screen.getByLabelText("Describe your project to Kreto");
      fireEvent.focus(input);
      expect(screen.getByTestId("kreto-presence")).toHaveAttribute("data-state", "attentive");
      fireEvent.blur(input);
      expect(screen.getByTestId("kreto-presence")).toHaveAttribute("data-state", "idle");
    });

    it("is listening only once the browser mic stream actually resolves, never on click alone", async () => {
      renderModal();
      fireEvent.click(screen.getByLabelText("Describe it by voice instead"));
      await screen.findByLabelText("Stop recording");
      expect(screen.getByTestId("kreto-presence")).toHaveAttribute("data-state", "listening");
      // Let the recording round-trip finish so no act() warning leaks out.
      fireEvent.click(screen.getByLabelText("Stop recording"));
      await screen.findByText("Kreto structured your project — review and edit");
    });

    it("never enters listening when mic permission is denied", async () => {
      stubMicPermission("deny");
      renderModal();
      fireEvent.click(screen.getByLabelText("Describe it by voice instead"));
      await waitFor(() => expect(mocks.toast).toHaveBeenCalled());
      expect(screen.queryByLabelText("Stop recording")).not.toBeInTheDocument();
      expect(screen.getByTestId("kreto-presence")).toHaveAttribute("data-state", "idle");
    });

    it("is processing only while the real extract-brief request is in flight", async () => {
      renderModal();
      const input = screen.getByLabelText("Describe your project to Kreto");
      fireEvent.change(input, { target: { value: "A real editorial shoot brief for testing." } });
      fireEvent.click(screen.getByLabelText("Send to Kreto"));
      // Synchronous: setMode("thinking") runs in the click handler itself,
      // before the mocked network promise has a chance to resolve.
      expect(screen.getByTestId("kreto-presence")).toHaveAttribute("data-state", "processing");
      // Let the in-flight request settle before the test ends, so its state
      // update doesn't land outside of this test's act() scope.
      await screen.findByText("Kreto structured your project — review and edit");
    });

    it("is proposal_ready with no caution banner for a clean, confidently-typed draft", async () => {
      renderModal();
      fireEvent.click(screen.getByText("Photo Shoot"));
      fireEvent.click(screen.getByLabelText("Send to Kreto"));
      await screen.findByText("Kreto structured your project — review and edit");
      expect(screen.getByTestId("kreto-presence")).toHaveAttribute("data-state", "proposal_ready");
      expect(screen.queryByText("Worth a look before you continue")).not.toBeInTheDocument();
    });

    it("is caution, with real explanatory text, when the project type can't be confidently inferred", async () => {
      renderModal();
      const input = screen.getByLabelText("Describe your project to Kreto");
      // No workspace type keyword matches this -- inferWorkspaceType falls
      // back to "general", the real, honest "uncertain" signal.
      fireEvent.change(input, { target: { value: "zzz completely unclassifiable nonsense zzz" } });
      fireEvent.click(screen.getByLabelText("Send to Kreto"));
      await screen.findByText("Kreto structured your project — review and edit");
      expect(screen.getByTestId("kreto-presence")).toHaveAttribute("data-state", "caution");
      expect(screen.getByText(/wasn't confident about the project type/i)).toBeInTheDocument();
    });

    it("is caution when extraction failed and the draft degraded to raw text, but still lets the user proceed", async () => {
      mocks.invoke.mockRejectedValueOnce(new Error("extract-brief unavailable"));
      renderModal();
      const input = screen.getByLabelText("Describe your project to Kreto");
      fireEvent.change(input, { target: { value: "A brief Kreto will fail to expand." } });
      fireEvent.click(screen.getByLabelText("Send to Kreto"));
      await screen.findByText("Kreto structured your project — review and edit");
      expect(screen.getByTestId("kreto-presence")).toHaveAttribute("data-state", "caution");
      expect(screen.getByText(/couldn't structure this one/i)).toBeInTheDocument();
    });

    it("shows a calm error state on a real failed link extraction, preserves the input, and retry returns to the link form", async () => {
      mocks.invoke.mockRejectedValueOnce(new Error("Sheet not shared"));
      renderModal();
      fireEvent.click(screen.getByText("Paste a Google Sheet"));
      const linkInput = screen.getByPlaceholderText(/docs\.google\.com/i);
      fireEvent.change(linkInput, { target: { value: "https://docs.google.com/spreadsheets/d/abc" } });
      fireEvent.click(screen.getByText("Continue"));

      await screen.findByText("Kreto couldn't finish that draft.");
      expect(screen.getByTestId("kreto-presence")).toHaveAttribute("data-state", "error");
      // Never claims the Studio was created, and there's a way forward.
      expect(screen.queryByText("Studio room ready")).not.toBeInTheDocument();

      fireEvent.click(screen.getByText("Try again"));
      expect(screen.getByPlaceholderText(/docs\.google\.com/i)).toHaveValue(
        "https://docs.google.com/spreadsheets/d/abc",
      );
    });

    it("navigates to the new Studio with a real, non-spoofable success flag in route state, not a query param", async () => {
      renderModal();
      fireEvent.click(screen.getByText("Photo Shoot"));
      fireEvent.click(screen.getByLabelText("Send to Kreto"));
      await screen.findByText("Kreto structured your project — review and edit");
      fireEvent.click(screen.getByText("No — personal/passion"));
      fireEvent.click(screen.getByText("Create all & open"));

      await waitFor(() => expect(mocks.navigate).toHaveBeenCalled(), { timeout: 1000 });
      const [to, opts] = mocks.navigate.mock.calls[0];
      expect(to).toBe("/desk/new-project-id");
      expect(opts).toEqual({ state: { kretoJustCreated: true } });
    });
  });
});
