export const EVENT_SCORES = {
  shot_make: 100,
  shot_miss: -50,
  dribble_combo: 20,
  challenge_fail: -30
};

export const CHALLENGES = [
  { id: 'three_in_a_row', label: '🔥 Make 3 in a row', bonus: 250, difficulty: 'hard' },
  { id: 'hit_three_pointer', label: '🏀 Hit a 3-pointer', bonus: 160, difficulty: 'medium' },
  { id: 'five_in_30s', label: '⏱ Score 5 baskets in 30 seconds', bonus: 320, difficulty: 'hard' },
  { id: 'swish_only', label: '🎯 Swish-only challenge', bonus: 220, difficulty: 'hard' },
  { id: 'two_fast_makes', label: '⚡ Make 2 shots in 10 seconds', bonus: 140, difficulty: 'easy' }
];

export function scoreEvent(type) {
  return EVENT_SCORES[type] ?? 0;
}

export function pickChallenge(random = Math.random) {
  const idx = Math.floor(random() * CHALLENGES.length);
  return CHALLENGES[idx];
}

export function calcTier(points) {
  if (points >= 4000) return 'Legend';
  if (points >= 2500) return 'Elite';
  if (points >= 1200) return 'Pro';
  if (points >= 500) return 'Rookie+';
  return 'Rookie';
}

export function payoutEligibility({ weeklyRank, tier, verifiedSessions }) {
  const rankEligible = weeklyRank > 0 && weeklyRank <= 500;
  const tierEligible = ['Legend', 'Elite'].includes(tier);
  const sessionEligible = verifiedSessions >= 3;

  return {
    eligible: rankEligible && tierEligible && sessionEligible,
    reasons: {
      rankEligible,
      tierEligible,
      sessionEligible
    }
  };
}

export function applyEvent(player, event, activeChallenge = null) {
  const delta = scoreEvent(event.type);
  const updated = {
    ...player,
    points: Math.max(0, player.points + delta),
    makes: player.makes + (event.type === 'shot_make' ? 1 : 0),
    misses: player.misses + (event.type === 'shot_miss' ? 1 : 0),
    events: [...player.events, event]
  };

  let challengeResult = null;
  if (activeChallenge && event.challengeOutcome) {
    if (event.challengeOutcome === 'success') {
      updated.points += activeChallenge.bonus;
      challengeResult = {
        challengeId: activeChallenge.id,
        label: activeChallenge.label,
        bonus: activeChallenge.bonus,
        success: true
      };
    }
    if (event.challengeOutcome === 'fail') {
      updated.points = Math.max(0, updated.points + EVENT_SCORES.challenge_fail);
      challengeResult = {
        challengeId: activeChallenge.id,
        label: activeChallenge.label,
        penalty: EVENT_SCORES.challenge_fail,
        success: false
      };
    }
  }

  updated.tier = calcTier(updated.points);
  return { player: updated, challengeResult };
}
