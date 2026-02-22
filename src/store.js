import { applyEvent, payoutEligibility, pickChallenge } from './game.js';

function id() {
  return Math.random().toString(36).slice(2, 10);
}

export class GameStore {
  constructor() {
    this.sessions = new Map();
    this.players = new Map();
    this.weeklyLeaderboard = [];
  }

  ensurePlayer(playerId) {
    if (!this.players.has(playerId)) {
      this.players.set(playerId, {
        playerId,
        name: `Player-${playerId.slice(-4)}`,
        points: 0,
        makes: 0,
        misses: 0,
        tier: 'Rookie',
        verifiedSessions: 0,
        events: []
      });
    }
    return this.players.get(playerId);
  }

  startSession(playerId) {
    const player = this.ensurePlayer(playerId);
    const sessionId = id();
    this.sessions.set(sessionId, {
      sessionId,
      playerId,
      startedAt: Date.now(),
      activeChallenge: pickChallenge(),
      eventCount: 0,
      verified: false
    });
    return { sessionId, player, challenge: this.sessions.get(sessionId).activeChallenge };
  }

  submitEvent(sessionId, event) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const player = this.ensurePlayer(session.playerId);
    const { player: updated, challengeResult } = applyEvent(player, event, session.activeChallenge);

    session.eventCount += 1;
    if (!session.verified && session.eventCount >= 5) {
      session.verified = true;
      updated.verifiedSessions += 1;
    }

    if (challengeResult) {
      session.activeChallenge = pickChallenge();
    }

    this.players.set(session.playerId, updated);
    this.refreshLeaderboard();

    const weeklyRank = this.weeklyLeaderboard.findIndex((p) => p.playerId === updated.playerId) + 1;
    const payout = payoutEligibility({
      weeklyRank,
      tier: updated.tier,
      verifiedSessions: updated.verifiedSessions
    });

    return {
      player: updated,
      weeklyRank,
      challengeResult,
      activeChallenge: session.activeChallenge,
      payout
    };
  }

  refreshLeaderboard() {
    this.weeklyLeaderboard = [...this.players.values()].sort((a, b) => b.points - a.points);
  }

  getLeaderboard(scope = 'global') {
    this.refreshLeaderboard();
    return {
      scope,
      entries: this.weeklyLeaderboard.map((p, idx) => ({
        rank: idx + 1,
        playerId: p.playerId,
        name: p.name,
        points: p.points,
        tier: p.tier
      }))
    };
  }
}
