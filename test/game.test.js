import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEvent, calcTier, payoutEligibility } from '../src/game.js';
import { GameStore } from '../src/store.js';

test('applyEvent scores make and updates tier', () => {
  const player = { playerId: 'p1', points: 0, makes: 0, misses: 0, tier: 'Rookie', events: [], verifiedSessions: 0 };
  const { player: updated } = applyEvent(player, { type: 'shot_make' });
  assert.equal(updated.points, 100);
  assert.equal(updated.makes, 1);
  assert.equal(updated.tier, 'Rookie');
});

test('challenge success awards bonus', () => {
  const player = { playerId: 'p1', points: 1000, makes: 0, misses: 0, tier: 'Pro', events: [], verifiedSessions: 0 };
  const challenge = { id: 'c1', label: 'test', bonus: 200 };
  const { player: updated, challengeResult } = applyEvent(player, { type: 'shot_make', challengeOutcome: 'success' }, challenge);
  assert.equal(updated.points, 1300);
  assert.equal(challengeResult.success, true);
});

test('payout eligibility enforces all gates', () => {
  const eligible = payoutEligibility({ weeklyRank: 44, tier: 'Legend', verifiedSessions: 3 });
  assert.equal(eligible.eligible, true);
  const blocked = payoutEligibility({ weeklyRank: 600, tier: 'Pro', verifiedSessions: 1 });
  assert.equal(blocked.eligible, false);
});

test('store verifies session after enough events', () => {
  const store = new GameStore();
  const { sessionId } = store.startSession('demo');
  for (let i = 0; i < 5; i += 1) {
    store.submitEvent(sessionId, { type: 'shot_make' });
  }
  const board = store.getLeaderboard();
  assert.equal(board.entries[0].points, 500);
  assert.equal(calcTier(board.entries[0].points), 'Rookie+');
});
