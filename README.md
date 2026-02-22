# Hoops Quest AI MVP

A working MVP of your idea: real-life basketball that feels like a game, now with **real AI vision** using your camera.

## What works now

- Live camera mode in browser (`getUserMedia`) using your device camera.
- Real AI detector in-browser (TensorFlow.js + COCO-SSD) tracking player and basketball.
- Automatic make/miss event inference from ball trajectory and rim-zone crossing heuristics.
- Real-time scoring events:
  - make: `+100`
  - miss: `-50`
- Random challenge system with risk/reward.
- Weekly leaderboard ranking.
- Payout eligibility gating:
  - top 500 weekly
  - Elite/Legend tier
  - at least 3 verified sessions

## Run

```bash
npm start
```

Open: `http://localhost:3000`

> Important: allow camera access in your browser.

## Test

```bash
npm test
```

## Notes

- AI runs client-side in the browser (no cloud inference required).
- Detection quality depends on lighting, camera angle, and visibility of the ball/hoop area.
- For production, replace heuristics with a dedicated make/miss model while keeping the same event API contract.
