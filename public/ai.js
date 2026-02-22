// Real AI vision pipeline using TensorFlow.js + COCO-SSD in browser.
// Detects person + sports ball, then infers simple basketball events from ball trajectory.

const RIM_ZONE = {
  xMin: 0.35,
  xMax: 0.65,
  yMin: 0.05,
  yMax: 0.28
};

function inRimZone(cx, cy) {
  return cx >= RIM_ZONE.xMin && cx <= RIM_ZONE.xMax && cy >= RIM_ZONE.yMin && cy <= RIM_ZONE.yMax;
}

export async function loadAiDetector() {
  const tf = await import('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/+esm');
  await tf.ready();
  const cocoSsd = await import('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/+esm');
  const model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });

  return {
    detect: (video) => model.detect(video, 20)
  };
}

export class BasketballAiRef {
  constructor(onEvent) {
    this.onEvent = onEvent;
    this.lastBall = null;
    this.lastShotAt = 0;
    this.rimCrossedAt = 0;
    this.framesWithoutBall = 0;
    this.loopId = null;
  }

  stop() {
    if (this.loopId) cancelAnimationFrame(this.loopId);
    this.loopId = null;
  }

  start(video, detector, setOverlayText) {
    const run = async () => {
      if (video.readyState < 2) {
        this.loopId = requestAnimationFrame(run);
        return;
      }

      const preds = await detector.detect(video);
      const ball = preds
        .filter((p) => p.class === 'sports ball' && p.score > 0.35)
        .sort((a, b) => b.score - a.score)[0];
      const person = preds.some((p) => p.class === 'person' && p.score > 0.5);

      if (!person) setOverlayText('No player detected');
      else if (!ball) setOverlayText('Tracking player… ball not visible');
      else setOverlayText(`Ball tracked (${Math.round(ball.score * 100)}%)`);

      this.processBall(ball, video.videoWidth, video.videoHeight);
      this.loopId = requestAnimationFrame(run);
    };

    this.loopId = requestAnimationFrame(run);
  }

  processBall(ball, width, height) {
    const now = Date.now();

    if (!ball) {
      this.framesWithoutBall += 1;
      if (this.rimCrossedAt && this.framesWithoutBall > 8 && now - this.rimCrossedAt < 2200) {
        this.onEvent({ type: 'shot_make' });
        this.rimCrossedAt = 0;
      }
      this.lastBall = null;
      return;
    }

    this.framesWithoutBall = 0;

    const [x, y, w, h] = ball.bbox;
    const cx = (x + w / 2) / width;
    const cy = (y + h / 2) / height;

    if (this.lastBall) {
      const dy = cy - this.lastBall.cy;
      const goingUpFast = dy < -0.02;
      const fromLowerHalf = this.lastBall.cy > 0.45;
      const cooldownDone = now - this.lastShotAt > 2800;

      if (goingUpFast && fromLowerHalf && cooldownDone) {
        this.lastShotAt = now;
        this.rimCrossedAt = 0;
      }

      if (this.lastShotAt && inRimZone(cx, cy) && now - this.lastShotAt < 1800) {
        this.rimCrossedAt = now;
      }

      if (this.lastShotAt && !this.rimCrossedAt && now - this.lastShotAt > 1800) {
        this.onEvent({ type: 'shot_miss' });
        this.lastShotAt = 0;
      }

      if (this.rimCrossedAt && now - this.rimCrossedAt > 1200) {
        // No disappearance pattern; still count as make after stable rim cross.
        this.onEvent({ type: 'shot_make' });
        this.rimCrossedAt = 0;
        this.lastShotAt = 0;
      }
    }

    this.lastBall = { cx, cy, t: now };
  }
}
