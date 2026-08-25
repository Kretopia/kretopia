import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useProjectFlow, stageToPhase, STUDIO_PHASES, type ProjectFlowSignals } from "../useProjectFlow";

const baseSignals: ProjectFlowSignals = {
  messageCount: 0,
  noteCount: 0,
  taskCount: 0,
  taskDoneCount: 0,
  fileCount: 0,
  approvalApprovedCount: 0,
  approvalPendingCount: 0,
  contractCount: 0,
  contractSignedCount: 0,
  invoiceCount: 0,
  invoicePaidCount: 0,
  milestoneCount: 0,
};

describe("stageToPhase", () => {
  it("maps every one of the 8 stages onto one of the 6 phases, in order", () => {
    expect(stageToPhase("discussion")).toBe("discuss");
    expect(stageToPhase("brief")).toBe("define");
    expect(stageToPhase("tasks")).toBe("build");
    expect(stageToPhase("work")).toBe("build");
    expect(stageToPhase("review")).toBe("review");
    expect(stageToPhase("agreement")).toBe("commit");
    expect(stageToPhase("payment")).toBe("commit");
    expect(stageToPhase("complete")).toBe("complete");
  });

  it("never maps a stage outside the 6 known phase ids", () => {
    const knownPhaseIds = new Set(STUDIO_PHASES.map((p) => p.id));
    const stages = ["discussion", "brief", "tasks", "work", "review", "agreement", "payment", "complete"] as const;
    for (const s of stages) {
      expect(knownPhaseIds.has(stageToPhase(s))).toBe(true);
    }
  });
});

describe("useProjectFlow — six-phase display model", () => {
  it("starts at phase 'discuss' with nothing else complete", () => {
    const { result } = renderHook(() => useProjectFlow(baseSignals));
    expect(result.current.currentStageId).toBe("discussion");
    expect(result.current.currentPhaseId).toBe("discuss");
    expect(result.current.phaseStatus.discuss).toBe("current");
    expect(result.current.phaseStatus.define).toBe("todo");
    expect(result.current.phaseStatus.complete).toBe("todo");
  });

  it("marks 'build' current (not complete) while only one of its two stages is satisfied", () => {
    // tasks satisfied (taskCount >= 1) but work isn't (fileCount === 0) --
    // build spans both the "tasks" and "work" stages, so the phase should
    // read as in-progress, not complete, until both are done.
    const { result } = renderHook(() =>
      useProjectFlow({ ...baseSignals, messageCount: 1, noteCount: 1, taskCount: 1 })
    );
    expect(result.current.currentStageId).toBe("work");
    expect(result.current.currentPhaseId).toBe("build");
    expect(result.current.phaseStatus.discuss).toBe("complete");
    expect(result.current.phaseStatus.define).toBe("complete");
    expect(result.current.phaseStatus.build).toBe("current");
    expect(result.current.phaseStatus.review).toBe("todo");
  });

  it("marks 'commit' complete only once both agreement and payment stages clear", () => {
    const { result } = renderHook(() =>
      useProjectFlow({
        ...baseSignals,
        messageCount: 1, noteCount: 1, taskCount: 1, fileCount: 1,
        approvalApprovedCount: 1, contractCount: 1,
        // payment stage NOT yet satisfied
      })
    );
    expect(result.current.currentStageId).toBe("payment");
    expect(result.current.currentPhaseId).toBe("commit");
    expect(result.current.phaseStatus.commit).toBe("current");
  });

  it("reaches 'complete' when projectStatus is completed, regardless of other signals", () => {
    const { result } = renderHook(() =>
      useProjectFlow({ ...baseSignals, projectStatus: "completed" })
    );
    expect(result.current.currentStageId).toBe("complete");
    expect(result.current.currentPhaseId).toBe("complete");
    expect(result.current.phaseStatus.complete).toBe("current");
    for (const phase of STUDIO_PHASES) {
      if (phase.id !== "complete") expect(result.current.phaseStatus[phase.id]).toBe("complete");
    }
  });

  it("a pinned stage overrides the derived stage but still maps to a valid phase", () => {
    const { result } = renderHook(() =>
      useProjectFlow({ ...baseSignals, pinnedStage: "agreement" })
    );
    expect(result.current.isPinned).toBe(true);
    expect(result.current.currentStageId).toBe("agreement");
    expect(result.current.currentPhaseId).toBe("commit");
  });
});
