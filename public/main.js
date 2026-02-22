import { BasketballAiRef, loadAiDetector } from './ai.js';

const $ = (id) => document.getElementById(id);
const state = {
  sessionId: null,
  aiRef: null,
  detector: null,
  running: false,
  challengeStreak: 0
};

async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function loadLeaderboard() {
  const res = await fetch('/api/leaderboard?scope=global');
  const data = await res.json();
  $('leaderboard').innerHTML = data.entries.slice(0, 10).map((e) => `<li>#${e.rank} ${e.name} — ${e.points} pts (${e.tier})</li>`).join('');
}

function showPopup(text) {
  const popup = $('popup');
  popup.textContent = text;
  popup.classList.add('show');
  setTimeout(() => popup.classList.remove('show'), 1000);
}

function renderPlayer(result) {
  $('points').textContent = result.player.points;
  $('makes').textContent = result.player.makes;
  $('misses').textContent = result.player.misses;
  $('tier').textContent = result.player.tier;
  $('rank').textContent = result.weeklyRank || '-';
  $('challenge').textContent = result.activeChallenge?.label || 'No challenge';

  const p = result.payout;
  $('payout').textContent = p.eligible
    ? '✅ Eligible for payout this week.'
    : `❌ Not eligible yet (rank:${p.reasons.rankEligible}, tier:${p.reasons.tierEligible}, sessions:${p.reasons.sessionEligible})`;

  loadLeaderboard();
}

function challengeOutcomeFromEvent(type) {
  if (type !== 'shot_make') {
    state.challengeStreak = 0;
    return null;
  }

  state.challengeStreak += 1;
  if (state.challengeStreak >= 3) {
    state.challengeStreak = 0;
    return 'success';
  }
  return null;
}

async function sendEvent(type) {
  if (!state.sessionId) return;
  const challengeOutcome = challengeOutcomeFromEvent(type);
  const result = await post(`/api/session/${state.sessionId}/event`, { type, challengeOutcome });

  if (type === 'shot_make') showPopup('+100 🧠🏀');
  if (type === 'shot_miss') showPopup('-50');
  if (result.challengeResult?.success) showPopup(`+${result.challengeResult.bonus} challenge complete`);
  if (result.challengeResult && !result.challengeResult.success) showPopup(`${result.challengeResult.penalty} challenge failed`);

  renderPlayer(result);
}

async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false
  });
  $('camera').srcObject = stream;
}

async function startLiveMode() {
  if (state.running) return;
  $('aiStatus').textContent = 'Loading AI model…';

  if (!state.detector) state.detector = await loadAiDetector();
  await startCamera();

  const data = await post('/api/session/start', { playerId: 'demo-player' });
  state.sessionId = data.sessionId;
  $('challenge').textContent = data.challenge.label;

  state.aiRef = new BasketballAiRef(({ type }) => {
    sendEvent(type);
  });

  state.aiRef.start($('camera'), state.detector, (text) => {
    $('aiStatus').textContent = text;
  });

  state.running = true;
  showPopup('Live AI Camera Mode ON');
  loadLeaderboard();
}

function stopLiveMode() {
  if (!state.running) return;
  state.aiRef?.stop();
  const stream = $('camera').srcObject;
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    $('camera').srcObject = null;
  }
  state.running = false;
  $('aiStatus').textContent = 'Stopped';
}

$('start').addEventListener('click', startLiveMode);
$('stop').addEventListener('click', stopLiveMode);

loadLeaderboard();
