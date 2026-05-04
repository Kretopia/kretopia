import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// 30fps × 95s = 2850 frames
export const RemotionRoot = () => (
  <>
    <Composition
      id="main"
      component={MainVideo}
      durationInFrames={2850}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);
