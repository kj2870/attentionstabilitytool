const beginnerQuotes = [
  "Stillness begins the moment you stop chasing the next thought.",
  "A quiet gaze can teach the mind how to rest.",
  "The flame does not hurry. Let your attention learn from it.",
];

const midQuotes = [
  "Attention deepens when effort becomes softer, not harder.",
  "The steadier the gaze, the more clearly the inner noise is seen.",
  "Stillness is not emptiness. It is undivided presence.",
];

const deepQuotes = [
  "When attention stops scattering, awareness begins to reveal itself.",
  "The mind grows subtle when it is no longer pulled by every movement.",
  "A steady flame outside can awaken steadiness within.",
];

export function getQuoteForStreak(streak: number) {
  let bank = beginnerQuotes;

  if (streak >= 4 && streak <= 10) {
    bank = midQuotes;
  }

  if (streak >= 11) {
    bank = deepQuotes;
  }

  const index = streak % bank.length;
  return bank[index];
}