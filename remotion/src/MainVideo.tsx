import { AbsoluteFill, Sequence } from "remotion";
import { SceneHook } from "./scenes/SceneHook";
import { SceneSearch } from "./scenes/SceneSearch";
import { SceneClaim } from "./scenes/SceneClaim";
import { SceneMatch } from "./scenes/SceneMatch";
import { SceneVoice } from "./scenes/SceneVoice";
import { SceneCopilot } from "./scenes/SceneCopilot";
import { ScenePay } from "./scenes/ScenePay";
import { SceneClose } from "./scenes/SceneClose";
import { COLORS } from "./theme";

// Total: 2850 frames @ 30fps = 95s
// Hook 0-360 (12s) | Search 360-660 (10s) | Claim 660-960 (10s) |
// Match 960-1290 (11s) | Voice 1290-1650 (12s) | Copilot 1650-2040 (13s) |
// Pay 2040-2460 (14s) | Close 2460-2850 (13s)
export const MainVideo = () => {
  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      <Sequence from={0} durationInFrames={360}><SceneHook /></Sequence>
      <Sequence from={360} durationInFrames={300}><SceneSearch /></Sequence>
      <Sequence from={660} durationInFrames={300}><SceneClaim /></Sequence>
      <Sequence from={960} durationInFrames={330}><SceneMatch /></Sequence>
      <Sequence from={1290} durationInFrames={360}><SceneVoice /></Sequence>
      <Sequence from={1650} durationInFrames={390}><SceneCopilot /></Sequence>
      <Sequence from={2040} durationInFrames={420}><ScenePay /></Sequence>
      <Sequence from={2460} durationInFrames={390}><SceneClose /></Sequence>
    </AbsoluteFill>
  );
};
