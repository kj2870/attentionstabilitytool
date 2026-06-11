// One quote per mandala day (1-48), shown on the session summary screen.
// Sequenced as an arc: days 1-16 ground the practice, 17-32 deepen it,
// 33-48 point past technique toward the self. Sources are the contemplative
// traditions behind trataka — Yoga Sutras, Gita, Upanishads, Zen, Vedanta.
export type DailyQuote = {
  text: string;
  source: string;
};

export const DAILY_QUOTES: DailyQuote[] = [
  // --- Days 1-16: grounding the practice -----------------------------------
  {
    text: "Yoga is the stilling of the fluctuations of the mind.",
    source: "Patanjali, Yoga Sutras 1.2",
  },
  {
    text: "Practice becomes firmly grounded when attended to for a long time, without break, and with devotion.",
    source: "Patanjali, Yoga Sutras 1.14",
  },
  {
    text: "As a lamp in a windless place does not flicker, so is the disciplined mind of one absorbed in the self.",
    source: "Bhagavad Gita 6.19",
  },
  {
    text: "The mind is restless and hard to curb, but by practice and dispassion it can be held.",
    source: "Bhagavad Gita 6.35",
  },
  {
    text: "Muddy water, let stand, becomes clear.",
    source: "attributed to Lao Tzu",
  },
  {
    text: "We do not see our reflection in running water. We see it in still water.",
    source: "after Zhuangzi",
  },
  {
    text: "In the beginner's mind there are many possibilities, but in the expert's there are few.",
    source: "Shunryu Suzuki",
  },
  {
    text: "If you let go a little, you will have a little peace. If you let go a lot, you will have a lot of peace.",
    source: "Ajahn Chah",
  },
  {
    text: "The posture is steady and easeful.",
    source: "Patanjali, Yoga Sutras 2.46",
  },
  {
    text: "Feelings come and go like clouds in a windy sky. Conscious breathing is my anchor.",
    source: "Thich Nhat Hanh",
  },
  {
    text: "You can't stop the waves, but you can learn to surf.",
    source: "Jon Kabat-Zinn",
  },
  {
    text: "Be mindful and let things take their natural course. Then the mind becomes still like a clear forest pool.",
    source: "Ajahn Chah",
  },
  {
    text: "Lift yourself by yourself. You alone are your friend; you alone are your enemy.",
    source: "Bhagavad Gita 6.5",
  },
  {
    text: "All that we are is the result of what we have thought.",
    source: "Dhammapada, verse 1",
  },
  {
    text: "Take up one idea. Make that one idea your life. Let the brain, muscles, nerves, every part of your body be full of that idea.",
    source: "Swami Vivekananda",
  },
  {
    text: "Sitting quietly, doing nothing, spring comes, and the grass grows by itself.",
    source: "Zen verse, Zenrin Kushu",
  },

  // --- Days 17-32: deepening -----------------------------------------------
  {
    text: "Yoga is evenness of mind.",
    source: "Bhagavad Gita 2.48",
  },
  {
    text: "Better than a thousand hollow words is one word that brings peace.",
    source: "Dhammapada, verse 100",
  },
  {
    text: "Though one should conquer a thousand men a thousand times, the one who conquers himself is the greater victor.",
    source: "Dhammapada, verse 103",
  },
  {
    text: "You are your own refuge. Who else could be the refuge?",
    source: "Dhammapada, verse 160",
  },
  {
    text: "When you do something, you should burn yourself completely, like a good bonfire, leaving no trace of yourself.",
    source: "Shunryu Suzuki",
  },
  {
    text: "Set your life on fire. Seek those who fan your flames.",
    source: "Rumi",
  },
  {
    text: "The quieter you become, the more you are able to hear.",
    source: "attributed to Rumi",
  },
  {
    text: "You are the sky. Everything else is just the weather.",
    source: "Pema Chödrön",
  },
  {
    text: "The present moment is the only time over which we have dominion.",
    source: "Thich Nhat Hanh",
  },
  {
    text: "Wherever you stand, that is the entry point.",
    source: "after Kabir",
  },
  {
    text: "Like two birds on the selfsame tree: one eats the sweet fruit, the other looks on without eating.",
    source: "Mundaka Upanishad 3.1.1",
  },
  {
    text: "When the five senses are stilled, when the mind is stilled, when the intellect is stilled — that, say the wise, is the highest state.",
    source: "Katha Upanishad 2.3.10",
  },
  {
    text: "If you cannot find the truth right where you are, where else do you expect to find it?",
    source: "Dogen",
  },
  {
    text: "To study the self is to forget the self. To forget the self is to be awakened by all things.",
    source: "Dogen, Genjokoan",
  },
  {
    text: "Meditation is not a means to an end. It is both the means and the end.",
    source: "Jiddu Krishnamurti",
  },
  {
    text: "The ability to observe without evaluating is the highest form of intelligence.",
    source: "attributed to Jiddu Krishnamurti",
  },

  // --- Days 33-48: pointing inward -----------------------------------------
  {
    text: "The mind is only a bundle of thoughts, and the thoughts have their root in the thought 'I'.",
    source: "Ramana Maharshi",
  },
  {
    text: "Your own self-realization is the greatest service you can render the world.",
    source: "Ramana Maharshi",
  },
  {
    text: "The mind creates the abyss, the heart crosses it.",
    source: "Nisargadatta Maharaj",
  },
  {
    text: "Wisdom tells me I am nothing. Love tells me I am everything. Between the two, my life flows.",
    source: "Nisargadatta Maharaj",
  },
  {
    text: "You are pure awareness, the witness of all things.",
    source: "Ashtavakra Gita 1.3",
  },
  {
    text: "Thou art that.",
    source: "Chandogya Upanishad 6.8.7",
  },
  {
    text: "This very place is the lotus land; this very body, the Buddha.",
    source: "Hakuin, Song of Zazen",
  },
  {
    text: "At this moment, what is there to seek?",
    source: "after Hakuin",
  },
  {
    text: "The affairs of the world will go on forever. Do not delay the practice of meditation.",
    source: "Milarepa",
  },
  {
    text: "All the joy the world contains has come through wishing happiness for others.",
    source: "Shantideva, Bodhicharyavatara 8.129",
  },
  {
    text: "The winds of grace are always blowing; it is for us to raise our sails.",
    source: "Sri Ramakrishna",
  },
  {
    text: "Faith is the bird that feels the light and sings when the dawn is still dark.",
    source: "Rabindranath Tagore",
  },
  {
    text: "What is soft is strong: water wears away the hardest stone.",
    source: "after Lao Tzu, Tao Te Ching 78",
  },
  {
    text: "Knowing others is intelligence; knowing yourself is true wisdom.",
    source: "Lao Tzu, Tao Te Ching 33",
  },
  {
    text: "The whole moon and the entire sky are reflected in one dewdrop on the grass.",
    source: "Dogen",
  },
  {
    text: "When the lamp of the body is steady, the inner flame is seen.",
    source: "after Svetasvatara Upanishad 2.15",
  },
];

// Returns the quote for a given mandala day (1-48). Days past 48 wrap so
// long-term practitioners keep receiving the cycle.
export function getQuoteForDay(day: number): DailyQuote {
  const index = (Math.max(1, Math.round(day)) - 1) % DAILY_QUOTES.length;
  return DAILY_QUOTES[index];
}
