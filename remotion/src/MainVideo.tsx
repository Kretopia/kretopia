import { AbsoluteFill, Sequence } from "remotion";
import { SceneHook } from "./scenes/SceneHook";
import { SceneSearch } from "./scenes/SceneSearch";
import { SceneClaim } from "./scenes/SceneClaim";
import { SceneProfile } from "./scenes/SceneProfile";
import { SceneRollCall } from "./scenes/SceneRollCall";
import { SceneVouch } from "./scenes/SceneVouch";
import { SceneEPK } from "./scenes/SceneEPK";
import { SceneMatch } from "./scenes/SceneMatch";
import { SceneVoice } from "./scenes/SceneVoice";
import { SceneVideoCall } from "./scenes/SceneVideoCall";
import { SceneCopilot } from "./scenes/SceneCopilot";
import { ScenePay } from "./scenes/ScenePay";
import { SceneInvoice } from "./scenes/SceneInvoice";
import { SceneGigs } from "./scenes/SceneGigs";
import { SceneFund } from "./scenes/SceneFund";
import { SceneClose } from "./scenes/SceneClose";
import { COLORS } from "./theme";

// 30fps. Full creative journey: discovery → reputation → collaboration → agentic ops → monetization.
const SCENES = [
  { c: <SceneHook />, d: 360 },        // 12s — hook
  { c: <SceneSearch />, d: 300 },      // 10s — search "Michelene"
  { c: <SceneClaim />, d: 270 },       // 9s — claim profile
  { c: <SceneProfile />, d: 330 },     // 11s — Profile / EPK home (portfolio grid + tabs)
  { c: <SceneRollCall />, d: 300 },    // 10s — Verified credits / IMDb roll call
  { c: <SceneVouch />, d: 330 },       // 11s — peer vouches / trust badge
  { c: <SceneEPK />, d: 330 },         // 11s — one-link EPK + share
  { c: <SceneMatch />, d: 330 },       // 11s — Smart Match swipe
  { c: <SceneVoice />, d: 360 },       // 12s — voice-to-brief
  { c: <SceneVideoCall />, d: 330 },   // 11s — Studio video call
  { c: <SceneCopilot />, d: 390 },     // 13s — Thrive Copilot agentic tools
  { c: <ScenePay />, d: 420 },         // 14s — scan receipt → expenses
  { c: <SceneInvoice />, d: 360 },     // 12s — invoice copilot
  { c: <SceneGigs />, d: 360 },        // 12s — gigs scout & claim
  { c: <SceneFund />, d: 330 },        // 11s — ThriveFund
  { c: <SceneClose />, d: 390 },       // 13s — close
];

export const SCENE_PLAN = SCENES;
export const TOTAL_FRAMES = SCENES.reduce((s, x) => s + x.d, 0);

export const MainVideo = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      {SCENES.map((s, i) => {
        const start = from;
        from += s.d;
        return (
          <Sequence key={i} from={start} durationInFrames={s.d}>
            {s.c}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
