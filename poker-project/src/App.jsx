import React, { useState, useCallback } from 'react';

// ============================================
// DATA
// ============================================

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
const RANK_VALUES = { 'A': 14, 'K': 13, 'Q': 12, 'J': 11, '10': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 };

const HANDS = [
  { rank: 1, name: 'Royal Flush', desc: 'A K Q J 10 same suit', example: ['A♠', 'K♠', 'Q♠', 'J♠', '10♠'], tip: 'The best possible hand. Extremely rare.' },
  { rank: 2, name: 'Straight Flush', desc: '5 in a row, same suit', example: ['9♥', '8♥', '7♥', '6♥', '5♥'], tip: 'Five sequential cards of the same suit.' },
  { rank: 3, name: 'Four of a Kind', desc: '4 of the same card', example: ['K♠', 'K♥', 'K♦', 'K♣', '7♠'], tip: 'Four cards of the same rank.' },
  { rank: 4, name: 'Full House', desc: '3 of a kind + a pair', example: ['Q♠', 'Q♥', 'Q♦', '9♣', '9♠'], tip: 'Three of a kind plus a pair.' },
  { rank: 5, name: 'Flush', desc: '5 cards same suit', example: ['A♦', 'J♦', '8♦', '6♦', '2♦'], tip: 'Any five cards of the same suit.' },
  { rank: 6, name: 'Straight', desc: '5 in a row', example: ['10♠', '9♦', '8♣', '7♥', '6♠'], tip: 'Ace can be high (AKQJ10) or low (A2345).' },
  { rank: 7, name: 'Three of a Kind', desc: '3 of the same card', example: ['8♠', '8♥', '8♦', 'K♣', '4♠'], tip: 'Three cards of the same rank.' },
  { rank: 8, name: 'Two Pair', desc: '2 different pairs', example: ['J♠', 'J♦', '5♥', '5♣', 'A♠'], tip: 'Two different pairs of cards.' },
  { rank: 9, name: 'One Pair', desc: '2 of the same card', example: ['10♥', '10♦', 'A♠', '7♣', '3♦'], tip: 'Two cards of the same rank.' },
  { rank: 10, name: 'High Card', desc: 'Nothing. Highest card wins.', example: ['A♠', 'Q♦', '9♣', '6♥', '2♠'], tip: 'When no one has a pair or better.' },
];

const QUICK_TIPS = [
  { title: 'Position Matters', desc: 'Acting last lets you see what everyone does first. This is a big advantage.' },
  { title: 'Be Patient', desc: 'Good players fold most hands. Wait for strong starting cards.' },
  { title: 'Bet Strong Hands', desc: 'When you have a good hand, bet. Make opponents pay to see more cards.' },
  { title: 'Read the Board', desc: 'Look for possible flushes (3+ same suit) and straights (connected cards) on the table.' },
  { title: 'Kickers Matter', desc: 'If two players have the same pair, the highest other card (kicker) wins.' },
];

// ============================================
// SCENARIO GENERATORS
// ============================================

const SCENARIO_TYPES = [
  // Rare hands - no weight, but mustShow once per session
  { weight: 0, generator: generateRoyalFlush, name: 'Royal Flush', mustShow: true },
  { weight: 0, generator: generateStraightFlush, name: 'Straight Flush', mustShow: true },
  // Equal distribution for learning all hand types
  { weight: 10, generator: generateFourOfAKind, name: 'Four of a Kind' },
  { weight: 10, generator: generateFullHouse, name: 'Full House' },
  { weight: 10, generator: generateFlushDraw, name: 'Flush' },
  { weight: 10, generator: generateStraightDraw, name: 'Straight' },
  { weight: 10, generator: generateSetOnFlop, name: 'Three of a Kind' },
  { weight: 10, generator: generateTwoPair, name: 'Two Pair' },
  { weight: 10, generator: generatePremiumPair, name: 'One Pair' },
  // Evolving hands - realistic probability distribution
  { weight: 25, generator: generateEvolvingHand, name: 'Evolving Hand' },
];

// Track which "must show" hands have been seen this session
const seenMustShowHands = new Set();
let handCount = 0;

function pickScenario() {
  handCount++;
  
  // Check if there are must-show hands that haven't been seen yet
  const unseenMustShow = SCENARIO_TYPES.filter(s => s.mustShow && !seenMustShowHands.has(s.name));
  
  // Force a must-show hand every few hands if not seen yet
  if (unseenMustShow.length > 0 && (handCount === 3 || handCount === 6 || handCount % 8 === 0)) {
    const forced = unseenMustShow[Math.floor(Math.random() * unseenMustShow.length)];
    seenMustShowHands.add(forced.name);
    return forced;
  }
  
  // Normal weighted random selection
  const totalWeight = SCENARIO_TYPES.reduce((sum, s) => sum + s.weight, 0);
  let random = Math.random() * totalWeight;
  for (const scenario of SCENARIO_TYPES) {
    random -= scenario.weight;
    if (random <= 0) {
      if (scenario.mustShow) seenMustShowHands.add(scenario.name);
      return scenario;
    }
  }
  return SCENARIO_TYPES[SCENARIO_TYPES.length - 1];
}

function makeCard(rank, suit) {
  return { rank, suit, id: `${rank}${suit}` };
}

function getRandomSuit(exclude = []) {
  const available = SUITS.filter(s => !exclude.includes(s));
  return available[Math.floor(Math.random() * available.length)];
}

function getRandomRank(exclude = []) {
  const available = RANKS.filter(r => !exclude.includes(r));
  return available[Math.floor(Math.random() * available.length)];
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fillRemainingCards(hole, community, count) {
  const used = new Set([...hole, ...community].map(c => c.id));
  const available = [];
  SUITS.forEach(suit => {
    RANKS.forEach(rank => {
      const id = `${rank}${suit}`;
      if (!used.has(id)) available.push(makeCard(rank, suit));
    });
  });
  return shuffleArray(available).slice(0, count);
}

function generatePremiumPair() {
  const premiumRanks = ['A', 'K', 'Q', 'J'];
  const rank = premiumRanks[Math.floor(Math.random() * premiumRanks.length)];
  const suits = shuffleArray([...SUITS]);
  const hole = [makeCard(rank, suits[0]), makeCard(rank, suits[1])];
  const community = fillRemainingCards(hole, [], 5);
  return { hole, community };
}

function generateFlushDraw() {
  const suit = getRandomSuit();
  const ranks = shuffleArray([...RANKS]);
  const hole = [makeCard(ranks[0], suit), makeCard(ranks[1], suit)];
  const flop = [
    makeCard(ranks[2], suit),
    makeCard(ranks[3], suit),
    makeCard(getRandomRank([ranks[0], ranks[1], ranks[2], ranks[3]]), getRandomSuit([suit]))
  ];
  const hitFlush = Math.random() > 0.4;
  const remaining = fillRemainingCards(hole, flop, 10);
  let turn, river;
  if (hitFlush) {
    const flushCard = remaining.find(c => c.suit === suit) || remaining[0];
    turn = flushCard;
    river = remaining.find(c => c.id !== turn.id) || remaining[1];
  } else {
    turn = remaining.find(c => c.suit !== suit) || remaining[0];
    river = remaining.find(c => c.suit !== suit && c.id !== turn.id) || remaining[1];
  }
  return { hole, community: [...shuffleArray(flop), turn, river] };
}

function generateStraightDraw() {
  const startIdx = Math.floor(Math.random() * 8) + 1;
  const straightRanks = RANKS.slice(startIdx, startIdx + 4).reverse();
  const hole = [makeCard(straightRanks[0], getRandomSuit()), makeCard(straightRanks[1], getRandomSuit())];
  const flop = [
    makeCard(straightRanks[2], getRandomSuit()),
    makeCard(straightRanks[3], getRandomSuit()),
    makeCard(getRandomRank(straightRanks), getRandomSuit())
  ];
  const hitStraight = Math.random() > 0.35;
  const remaining = fillRemainingCards(hole, flop, 10);
  let turn, river;
  if (hitStraight) {
    const lowEnd = RANKS[startIdx + 4] || null;
    const highEnd = RANKS[startIdx - 1] || null;
    const hitRank = Math.random() > 0.5 ? (highEnd || lowEnd) : (lowEnd || highEnd);
    if (hitRank) {
      turn = makeCard(hitRank, getRandomSuit());
      river = remaining[0];
    } else {
      turn = remaining[0];
      river = remaining[1];
    }
  } else {
    turn = remaining[0];
    river = remaining[1];
  }
  return { hole, community: [...shuffleArray(flop), turn, river] };
}

function generateSetOnFlop() {
  const rank = getRandomRank(['A']);
  const suits = shuffleArray([...SUITS]);
  const hole = [makeCard(rank, suits[0]), makeCard(rank, suits[1])];
  const flop = [
    makeCard(rank, suits[2]),
    makeCard(getRandomRank([rank]), getRandomSuit()),
    makeCard(getRandomRank([rank]), getRandomSuit())
  ];
  const remaining = fillRemainingCards(hole, flop, 2);
  return { hole, community: [...shuffleArray(flop), ...remaining] };
}

function generateTwoPair() {
  const rank1 = getRandomRank();
  const rank2 = getRandomRank([rank1]);
  const hole = [makeCard(rank1, getRandomSuit()), makeCard(rank2, getRandomSuit())];
  const flop = [
    makeCard(rank1, getRandomSuit([hole[0].suit])),
    makeCard(rank2, getRandomSuit([hole[1].suit])),
    makeCard(getRandomRank([rank1, rank2]), getRandomSuit())
  ];
  const remaining = fillRemainingCards(hole, flop, 2);
  return { hole, community: [...shuffleArray(flop), ...remaining] };
}

function generateSuitedConnectors() {
  const suit = getRandomSuit();
  const startIdx = Math.floor(Math.random() * 8) + 2;
  const hole = [makeCard(RANKS[startIdx], suit), makeCard(RANKS[startIdx + 1], suit)];
  const community = fillRemainingCards(hole, [], 5);
  return { hole, community };
}

function generateRandom() {
  const deck = [];
  SUITS.forEach(suit => RANKS.forEach(rank => deck.push(makeCard(rank, suit))));
  const shuffled = shuffleArray(deck);
  return { hole: [shuffled[0], shuffled[1]], community: shuffled.slice(2, 7) };
}

// Royal Flush - A K Q J 10 of same suit
function generateRoyalFlush() {
  const suit = getRandomSuit();
  const royalRanks = ['A', 'K', 'Q', 'J', '10'];
  // Give player 2 of the royal cards
  const playerCards = shuffleArray([...royalRanks]).slice(0, 2);
  const hole = playerCards.map(r => makeCard(r, suit));
  const boardRoyals = royalRanks.filter(r => !playerCards.includes(r));
  const royalCommunity = boardRoyals.map(r => makeCard(r, suit));
  // Add 2 random cards to community
  const remaining = fillRemainingCards(hole, royalCommunity, 2);
  const community = [...shuffleArray([...royalCommunity, remaining[0]]), remaining[1]];
  return { hole, community };
}

// Straight Flush - 5 consecutive cards of same suit (not royal)
function generateStraightFlush() {
  const suit = getRandomSuit();
  // Start from 2-9 to avoid royal flush
  const startIdx = Math.floor(Math.random() * 8) + 1; // indices 1-8 (K down to 6)
  const sfRanks = RANKS.slice(startIdx, startIdx + 5).reverse();
  if (sfRanks.length < 5) return generateStraightFlush();
  // Give player 2 cards
  const playerCards = shuffleArray([...sfRanks]).slice(0, 2);
  const hole = playerCards.map(r => makeCard(r, suit));
  const boardSF = sfRanks.filter(r => !playerCards.includes(r));
  const sfCommunity = boardSF.map(r => makeCard(r, suit));
  const remaining = fillRemainingCards(hole, sfCommunity, 2);
  const community = [...shuffleArray([...sfCommunity, remaining[0]]), remaining[1]];
  return { hole, community };
}

// Four of a Kind - 4 cards of same rank
function generateFourOfAKind() {
  const rank = getRandomRank();
  const suits = shuffleArray([...SUITS]);
  // Give player a pair
  const hole = [makeCard(rank, suits[0]), makeCard(rank, suits[1])];
  // Put other 2 on board
  const quads = [makeCard(rank, suits[2]), makeCard(rank, suits[3])];
  const remaining = fillRemainingCards(hole, quads, 3);
  const community = shuffleArray([...quads, ...remaining]);
  return { hole, community };
}

// Full House - 3 of a kind + pair
function generateFullHouse() {
  const tripRank = getRandomRank();
  const pairRank = getRandomRank([tripRank]);
  const tripSuits = shuffleArray([...SUITS]).slice(0, 3);
  const pairSuits = shuffleArray([...SUITS]).slice(0, 2);
  // Give player a pair that will become trips
  const hole = [makeCard(tripRank, tripSuits[0]), makeCard(tripRank, tripSuits[1])];
  // Board has third trip card and the pair
  const fhCards = [
    makeCard(tripRank, tripSuits[2]),
    makeCard(pairRank, pairSuits[0]),
    makeCard(pairRank, pairSuits[1])
  ];
  const remaining = fillRemainingCards(hole, fhCards, 2);
  const community = shuffleArray([...fhCards, ...remaining]);
  return { hole, community };
}

// Evolving Hand - realistic probability distribution for pattern recognition
function generateEvolvingHand() {
  // Weighted random based on real poker probabilities
  const roll = Math.random() * 100;
  
  if (roll < 40) {
    // ONE PAIR (most common ~42%) - hole card pairs on board
    const rank = getRandomRank();
    const hole = [makeCard(rank, getRandomSuit()), makeCard(getRandomRank([rank]), getRandomSuit())];
    const flop = [
      makeCard(rank, getRandomSuit([hole[0].suit])),
      makeCard(getRandomRank([rank, hole[1].rank]), getRandomSuit()),
      makeCard(getRandomRank([rank, hole[1].rank]), getRandomSuit())
    ];
    const remaining = fillRemainingCards(hole, flop, 2);
    return { hole, community: [...flop, ...remaining] };
  } else if (roll < 65) {
    // TWO PAIR (~25%) - both hole cards pair up
    const rank1 = getRandomRank();
    const rank2 = getRandomRank([rank1]);
    const hole = [makeCard(rank1, getRandomSuit()), makeCard(rank2, getRandomSuit())];
    const flop = [
      makeCard(rank1, getRandomSuit([hole[0].suit])),
      makeCard(rank2, getRandomSuit([hole[1].suit])),
      makeCard(getRandomRank([rank1, rank2]), getRandomSuit())
    ];
    const remaining = fillRemainingCards(hole, flop, 2);
    return { hole, community: [...flop, ...remaining] };
  } else if (roll < 80) {
    // TRIPS (~15%) - pocket pair hits set
    const rank = getRandomRank();
    const suits = shuffleArray([...SUITS]);
    const hole = [makeCard(rank, suits[0]), makeCard(rank, suits[1])];
    const flop = [
      makeCard(rank, suits[2]),
      makeCard(getRandomRank([rank]), getRandomSuit()),
      makeCard(getRandomRank([rank]), getRandomSuit())
    ];
    const remaining = fillRemainingCards(hole, flop, 2);
    return { hole, community: [...flop, ...remaining] };
  } else if (roll < 88) {
    // STRAIGHT (~8%) - connected cards complete
    const startIdx = Math.floor(Math.random() * 8) + 1;
    const straightRanks = RANKS.slice(startIdx, startIdx + 5).reverse();
    if (straightRanks.length < 5) return generateEvolvingHand();
    const hole = [makeCard(straightRanks[0], getRandomSuit()), makeCard(straightRanks[1], getRandomSuit())];
    const flop = [
      makeCard(straightRanks[2], getRandomSuit()),
      makeCard(straightRanks[3], getRandomSuit()),
      makeCard(getRandomRank(straightRanks), getRandomSuit())
    ];
    const turn = makeCard(getRandomRank(straightRanks), getRandomSuit());
    const river = makeCard(straightRanks[4], getRandomSuit());
    return { hole, community: [...flop, turn, river] };
  } else if (roll < 94) {
    // FLUSH (~6%) - suited cards complete
    const suit = getRandomSuit();
    const ranks = shuffleArray([...RANKS]).slice(0, 5);
    const hole = [makeCard(ranks[0], suit), makeCard(ranks[1], suit)];
    const flop = [
      makeCard(ranks[2], suit),
      makeCard(ranks[3], suit),
      makeCard(getRandomRank(ranks), getRandomSuit([suit]))
    ];
    const turn = makeCard(getRandomRank(ranks), getRandomSuit([suit]));
    const river = makeCard(ranks[4], suit);
    return { hole, community: [...flop, turn, river] };
  } else if (roll < 98) {
    // FULL HOUSE (~4%) - trips + pair
    const tripRank = getRandomRank();
    const pairRank = getRandomRank([tripRank]);
    const suits = shuffleArray([...SUITS]);
    const hole = [makeCard(tripRank, suits[0]), makeCard(tripRank, suits[1])];
    const flop = [
      makeCard(tripRank, suits[2]),
      makeCard(pairRank, getRandomSuit()),
      makeCard(pairRank, getRandomSuit())
    ];
    const remaining = fillRemainingCards(hole, flop, 2);
    return { hole, community: [...flop, ...remaining] };
  } else {
    // QUADS (~2%) - four of a kind
    const rank = getRandomRank();
    const hole = [makeCard(rank, '♠'), makeCard(rank, '♥')];
    const flop = [
      makeCard(rank, '♦'),
      makeCard(rank, '♣'),
      makeCard(getRandomRank([rank]), getRandomSuit())
    ];
    const remaining = fillRemainingCards(hole, flop, 2);
    return { hole, community: [...flop, ...remaining] };
  }
}

// ============================================
// HAND EVALUATION
// ============================================

const evaluateHand = (cards) => {
  if (cards.length < 5) return null;
  const combos = getCombinations(cards, 5);
  let best = null;
  combos.forEach(combo => {
    const result = evaluate5(combo);
    if (!best || result.strength > best.strength) best = { ...result, cards: combo };
  });
  return best;
};

const getCombinations = (arr, size) => {
  if (size === arr.length) return [arr];
  if (size === 1) return arr.map(el => [el]);
  const result = [];
  arr.forEach((el, i) => {
    getCombinations(arr.slice(i + 1), size - 1).forEach(combo => result.push([el, ...combo]));
  });
  return result;
};

const evaluate5 = (cards) => {
  const ranks = cards.map(c => RANK_VALUES[c.rank]).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);
  const counts = {};
  ranks.forEach(r => counts[r] = (counts[r] || 0) + 1);
  const freq = Object.values(counts).sort((a, b) => b - a);
  const unique = [...new Set(ranks)].sort((a, b) => b - a);
  
  // Get ranks sorted by frequency then by value (for tiebreakers)
  const ranksByFreq = Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || Number(b[0]) - Number(a[0]))
    .map(([rank]) => Number(rank));
  
  let isStraight = false, straightHigh = 0;
  if (unique.length >= 5) {
    for (let i = 0; i <= unique.length - 5; i++) {
      if (unique[i] - unique[i + 4] === 4) { isStraight = true; straightHigh = unique[i]; break; }
    }
    if (!isStraight && unique.includes(14) && [5,4,3,2].every(r => unique.includes(r))) {
      isStraight = true; straightHigh = 5;
    }
  }
  
  // Calculate strength with proper tiebreakers
  if (isFlush && isStraight && straightHigh === 14) return { name: 'Royal Flush', strength: 10000000 };
  if (isFlush && isStraight) return { name: 'Straight Flush', strength: 9000000 + straightHigh };
  if (freq[0] === 4) {
    const quadRank = ranksByFreq[0];
    const kicker = ranksByFreq[1];
    return { name: 'Four of a Kind', strength: 8000000 + quadRank * 100 + kicker };
  }
  if (freq[0] === 3 && freq[1] === 2) {
    const tripRank = ranksByFreq[0];
    const pairRank = ranksByFreq[1];
    return { name: 'Full House', strength: 7000000 + tripRank * 100 + pairRank };
  }
  if (isFlush) {
    const flushStrength = ranks[0] * 10000 + ranks[1] * 1000 + ranks[2] * 100 + ranks[3] * 10 + ranks[4];
    return { name: 'Flush', strength: 6000000 + flushStrength };
  }
  if (isStraight) return { name: 'Straight', strength: 5000000 + straightHigh };
  if (freq[0] === 3) {
    const tripRank = ranksByFreq[0];
    const kickers = ranksByFreq.slice(1);
    return { name: 'Three of a Kind', strength: 4000000 + tripRank * 10000 + kickers[0] * 100 + kickers[1] };
  }
  if (freq[0] === 2 && freq[1] === 2) {
    const highPair = Math.max(ranksByFreq[0], ranksByFreq[1]);
    const lowPair = Math.min(ranksByFreq[0], ranksByFreq[1]);
    const kicker = ranksByFreq[2];
    return { name: 'Two Pair', strength: 3000000 + highPair * 10000 + lowPair * 100 + kicker };
  }
  if (freq[0] === 2) {
    const pairRank = ranksByFreq[0];
    const kickers = ranksByFreq.slice(1);
    return { name: 'One Pair', strength: 2000000 + pairRank * 10000 + kickers[0] * 100 + kickers[1] * 10 + kickers[2] };
  }
  const highCardStrength = ranks[0] * 10000 + ranks[1] * 1000 + ranks[2] * 100 + ranks[3] * 10 + ranks[4];
  return { name: 'High Card', strength: 1000000 + highCardStrength };
};

// ============================================
// COMPONENTS
// ============================================

const Card = ({ card, small, faceDown, highlight }) => {
  const width = small ? 64 : 88;
  const height = small ? 96 : 132;
  
  if (faceDown) {
    return (
      <div style={{
        width,
        height,
        borderRadius: 8,
        background: 'linear-gradient(145deg, #2a2a4a 0%, #1a1a2e 100%)',
        border: '2px solid #c9a227',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: width - 12,
          height: height - 12,
          borderRadius: 4,
          border: '1px solid #3a3a5a',
          background: 'repeating-linear-gradient(45deg, #252545, #252545 4px, #1e1e3e 4px, #1e1e3e 8px)',
        }} />
      </div>
    );
  }
  
  const data = typeof card === 'string' ? { rank: card.slice(0, -1), suit: card.slice(-1) } : card;
  const isRed = data.suit === '♥' || data.suit === '♦';
  const color = isRed ? '#c41e3a' : '#1a1a2e';
  
  const cornerFontSize = small ? 14 : 18;
  const centerFontSize = small ? 32 : 44;
  
  return (
    <div style={{
      width,
      height,
      borderRadius: 8,
      background: 'linear-gradient(180deg, #ffffff 0%, #f5f0e6 100%)',
      boxShadow: highlight 
        ? '0 0 8px #c9a227, 0 0 16px rgba(201,162,39,0.6), 0 4px 12px rgba(0,0,0,0.4)'
        : '0 4px 12px rgba(0,0,0,0.4)',
      border: highlight ? '3px solid #f4e4a6' : '1px solid #d4c5a9',
      position: 'relative',
      fontFamily: "Georgia, serif",
      animation: highlight ? 'winningGlow 1.5s ease-in-out infinite' : 'none',
    }}>
      {/* Top left */}
      <div style={{
        position: 'absolute',
        top: 4,
        left: 5,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        lineHeight: 1.1,
        color,
      }}>
        <span style={{ fontSize: cornerFontSize, fontWeight: 700 }}>{data.rank}</span>
        <span style={{ fontSize: cornerFontSize }}>{data.suit}</span>
      </div>
      
      {/* Center */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: centerFontSize,
        color,
        lineHeight: 1,
      }}>
        {data.suit}
      </div>
      
      {/* Bottom right */}
      <div style={{
        position: 'absolute',
        bottom: 4,
        right: 5,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        lineHeight: 1.1,
        color,
        transform: 'rotate(180deg)',
      }}>
        <span style={{ fontSize: cornerFontSize, fontWeight: 700 }}>{data.rank}</span>
        <span style={{ fontSize: cornerFontSize }}>{data.suit}</span>
      </div>
    </div>
  );
};

const Button = ({ children, onClick, variant = 'primary', disabled }) => {
  const styles = {
    primary: { 
      background: 'linear-gradient(180deg, #c9a227 0%, #a68523 50%, #8b6914 100%)',
      color: '#1a1a2e',
      border: '2px solid #d4af37',
    },
    secondary: { 
      background: 'linear-gradient(180deg, #2d4a3e 0%, #1e3329 100%)',
      color: '#c9a227',
      border: '2px solid #3d5a4e',
    },
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '16px 32px',
        borderRadius: 10,
        fontFamily: "'Cinzel', Georgia, serif",
        fontSize: 16,
        fontWeight: 700,
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        ...styles[variant],
      }}
    >
      {children}
    </button>
  );
};

// ============================================
// MAIN APP
// ============================================

export default function PokerBasics() {
  const [view, setView] = useState('home');
  const [gameData, setGameData] = useState(null);
  const [stage, setStage] = useState('preflop');
  const [visibleCommunity, setVisibleCommunity] = useState([]);

  const startGame = useCallback(() => {
    const scenario = pickScenario();
    const data = scenario.generator();
    setGameData(data);
    setStage('preflop');
    setVisibleCommunity([]);
    setView('play');
  }, []);

  const dealNext = () => {
    if (!gameData) return;
    if (stage === 'preflop') {
      setVisibleCommunity(gameData.community.slice(0, 3));
      setStage('flop');
    } else if (stage === 'flop') {
      setVisibleCommunity(gameData.community.slice(0, 4));
      setStage('turn');
    } else if (stage === 'turn') {
      setVisibleCommunity(gameData.community);
      setStage('river');
    }
  };

  const allCards = gameData ? [...gameData.hole, ...visibleCommunity] : [];
  const result = allCards.length >= 5 ? evaluateHand(allCards) : null;
  const isRiver = stage === 'river';
  const winningCardIds = result && isRiver ? new Set(result.cards.map(c => c.id)) : new Set();
  const handInfo = result ? HANDS.find(hand => hand.name === result.name) : null;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a12',
      fontFamily: "'Lato', sans-serif",
      color: '#e8e4d9',
      fontSize: 18,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Lato:wght@400;700&family=Nunito:wght@700;800;900&display=swap');
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes winningGlow {
          0%, 100% { 
            box-shadow: 0 0 8px #c9a227, 0 0 16px rgba(201,162,39,0.6), 0 4px 12px rgba(0,0,0,0.4);
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 0 16px #f4e4a6, 0 0 28px rgba(244,228,166,0.8), 0 0 40px rgba(201,162,39,0.5), 0 4px 12px rgba(0,0,0,0.4);
            transform: scale(1.03);
          }
        }
      `}</style>
      
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        
        {/* Header */}
        <header style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 14 }}>
            <span style={{ fontSize: 28 }}>♠</span>
            <span style={{ fontSize: 28, color: '#c41e3a' }}>♥</span>
            <span style={{ fontSize: 28, color: '#c41e3a' }}>♦</span>
            <span style={{ fontSize: 28 }}>♣</span>
          </div>
          <h1 style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 36,
            fontWeight: 700,
            margin: 0,
            background: 'linear-gradient(90deg, #c9a227, #f4e4a6, #c9a227, #f4e4a6, #c9a227)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'shimmer 3s linear infinite',
            letterSpacing: '2px',
          }}>
            POKER BASICS
          </h1>
          <p style={{ color: '#6b7b6b', fontSize: 14, marginTop: 8, letterSpacing: '2px', textTransform: 'uppercase' }}>
            Learn to Play
          </p>
          {/* Boosted Logo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
            <img 
              src="/Boosted Logo.png" 
              alt="Boosted" 
              style={{ height: 12, opacity: 0.5 }}
            />
          </div>
        </header>

        {/* Navigation */}
        <nav style={{
          display: 'flex',
          gap: 6,
          marginBottom: 24,
          padding: 6,
          background: 'linear-gradient(180deg, #1a2e1a 0%, #0f1a0f 100%)',
          borderRadius: 12,
          border: '1px solid #2d4a2d',
        }}>
          {[
            { id: 'home', label: 'Home' },
            { id: 'play', label: 'Practice' },
            { id: 'hands', label: 'Hands' },
            { id: 'tips', label: 'Tips' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              style={{
                flex: 1,
                padding: '14px 10px',
                border: 'none',
                borderRadius: 10,
                background: view === tab.id ? 'linear-gradient(180deg, #c9a227 0%, #8b6914 100%)' : 'transparent',
                color: view === tab.id ? '#1a1a2e' : '#6b7b6b',
                fontFamily: "'Cinzel', serif",
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* HOME */}
        {view === 'home' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              background: 'radial-gradient(ellipse at center, #1e5631 0%, #0d2818 70%)',
              borderRadius: 18,
              padding: 36,
              border: '6px solid #2c1810',
              boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5), 0 0 0 2px #c9a227',
              marginBottom: 24,
            }}>
              <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 24, margin: '0 0 12px', color: '#f4e4a6' }}>
                How Poker Works (At a Glance)
              </h2>
              <p style={{ color: '#a8c4a8', fontSize: 17, lineHeight: 1.6, margin: '0 0 18px' }}>
                The goal is to win the pot by making the best 5-card hand or by getting everyone else to fold.
              </p>
              <div style={{ display: 'grid', gap: 12, marginBottom: 22, textAlign: 'left' }}>
                <div style={{ color: '#e8e4d9', fontSize: 16 }}>
                  • You get <strong style={{ color: '#f4e4a6' }}>2 private cards</strong> (only you see these).
                </div>
                <div style={{ color: '#e8e4d9', fontSize: 16 }}>
                  • <strong style={{ color: '#f4e4a6' }}>5 community cards</strong> are shared: flop (3), turn (1), river (1).
                </div>
                <div style={{ color: '#e8e4d9', fontSize: 16 }}>
                  • Combine your 2 + the 5 community cards to make your <strong style={{ color: '#f4e4a6' }}>best 5-card hand</strong>.
                </div>
                <div style={{ color: '#e8e4d9', fontSize: 16 }}>
                  • Betting rounds happen after each reveal.
                </div>
              </div>
              <Button onClick={startGame}>Start Practice</Button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div onClick={() => setView('hands')} style={{
                background: 'linear-gradient(180deg, #1a2e1a 0%, #0f1a0f 100%)',
                borderRadius: 12,
                padding: 18,
                cursor: 'pointer',
                border: '1px solid #2d4a2d',
              }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>📚</div>
                <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 15, color: '#c9a227' }}>Hand Rankings</div>
                <div style={{ color: '#6b7b6b', fontSize: 13, marginTop: 4 }}>What beats what</div>
              </div>
              <div onClick={() => setView('tips')} style={{
                background: 'linear-gradient(180deg, #1a2e1a 0%, #0f1a0f 100%)',
                borderRadius: 12,
                padding: 18,
                cursor: 'pointer',
                border: '1px solid #2d4a2d',
              }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>💡</div>
                <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 15, color: '#c9a227' }}>Quick Tips</div>
                <div style={{ color: '#6b7b6b', fontSize: 13, marginTop: 4 }}>Basic strategy</div>
              </div>
            </div>
          </div>
        )}

        {/* PLAY */}
        {view === 'play' && gameData && (
          <div>
            {/* Table */}
            <div style={{
              background: 'radial-gradient(ellipse at center, #1e5631 0%, #0d2818 70%)',
              borderRadius: 18,
              padding: 28,
              border: '6px solid #2c1810',
              boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5), 0 0 0 2px #c9a227',
              marginBottom: 18,
            }}>
              {/* Stage */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 8,
                marginBottom: 18,
              }}>
                {['preflop', 'flop', 'turn', 'river'].map((s, i) => (
                  <React.Fragment key={s}>
                    <div style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: ['preflop', 'flop', 'turn', 'river'].indexOf(stage) >= i ? '#c9a227' : '#2d4a2d',
                      boxShadow: ['preflop', 'flop', 'turn', 'river'].indexOf(stage) >= i ? '0 0 8px #c9a227' : 'none',
                    }} />
                    {i < 3 && <div style={{ width: 24, height: 3, background: ['preflop', 'flop', 'turn', 'river'].indexOf(stage) > i ? '#c9a227' : '#2d4a2d' }} />}
                  </React.Fragment>
                ))}
              </div>
              
              <div style={{ textAlign: 'center', marginBottom: 14, fontFamily: "'Cinzel', serif", fontSize: 14, color: '#c9a227', letterSpacing: '2px', textTransform: 'uppercase' }}>
                {stage === 'preflop' ? 'Pre-Flop' : stage.charAt(0).toUpperCase() + stage.slice(1)}
              </div>

              {/* Community Cards */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', minHeight: 132, alignItems: 'center', flexWrap: 'wrap' }}>
                  {stage === 'preflop' ? (
                    <div style={{ color: '#4a6b4a', fontSize: 15, fontStyle: 'italic' }}>Community cards will appear here</div>
                  ) : (
                    <>
                      {visibleCommunity.map((c, i) => <Card key={i} card={c} highlight={winningCardIds.has(c.id)} />)}
                      {[...Array(5 - visibleCommunity.length)].map((_, i) => <Card key={`e${i}`} faceDown />)}
                    </>
                  )}
                </div>
              </div>

              <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #3d5a3d, transparent)', margin: '0 16px 18px' }} />

              {/* Your Cards */}
              <div>
                <div style={{ fontSize: 12, fontFamily: "'Cinzel', serif", color: '#6b7b6b', textAlign: 'center', marginBottom: 12, letterSpacing: '2px', textTransform: 'uppercase' }}>
                  Your Cards
                </div>
                <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
                  {gameData.hole.map((c, i) => <Card key={i} card={c} highlight={winningCardIds.has(c.id)} />)}
                </div>
              </div>
            </div>

            {/* Current Hand Display - shows progress during play, reveals final hand at river */}
            {result && !isRiver && (
              <div style={{
                background: 'linear-gradient(180deg, #1a2e1a 0%, #0f1a0f 100%)',
                borderRadius: 12,
                padding: 16,
                textAlign: 'center',
                marginBottom: 18,
                border: '1px solid #2d4a2d',
              }}>
                <div style={{ fontSize: 12, color: '#6b7b6b', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 4 }}>
                  Current Hand
                </div>
                <div style={{ fontSize: 20, fontFamily: "'Cinzel', serif", fontWeight: 700, color: '#a8c4a8' }}>
                  {result.name}
                </div>
                <div style={{ marginTop: 6, color: '#6b7b6b', fontSize: 14 }}>
                  Keep dealing to see your final hand...
                </div>
              </div>
            )}

            {/* Final Hand Reveal at River */}
            {result && isRiver && (
              <div style={{
                background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)',
                borderRadius: 12,
                padding: 20,
                textAlign: 'center',
                marginBottom: 18,
                border: '2px solid #c9a227',
                boxShadow: '0 0 20px rgba(201,162,39,0.3)',
              }}>
                <div style={{ fontSize: 13, color: '#c9a227', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 6 }}>
                  🎉 Your Final Hand
                </div>
                <div style={{ fontSize: 26, fontFamily: "'Cinzel', serif", fontWeight: 700, color: '#f4e4a6' }}>
                  {result.name}
                </div>
                {handInfo && (
                  <div style={{ marginTop: 10, color: '#a8c4a8', fontSize: 15, lineHeight: 1.5 }}>
                    {handInfo.desc}. {handInfo.tip}
                  </div>
                )}
                <div style={{ marginTop: 12, color: '#6b7b6b', fontSize: 13, fontStyle: 'italic' }}>
                  The glowing cards show which 5 cards make your best hand!
                </div>
              </div>
            )}

            {/* Controls */}
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              {stage !== 'river' && (
                <Button onClick={dealNext}>
                  Deal {stage === 'preflop' ? 'Flop' : stage === 'flop' ? 'Turn' : 'River'}
                </Button>
              )}
              <Button variant="secondary" onClick={startGame}>New Hand</Button>
            </div>
          </div>
        )}
        
        {view === 'play' && !gameData && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ color: '#6b7b6b', marginBottom: 16 }}>Ready to practice?</p>
            <Button onClick={startGame}>Deal Cards</Button>
          </div>
        )}

        {/* HANDS */}
        {view === 'hands' && (
          <div style={{
            background: 'linear-gradient(180deg, #1a2e1a 0%, #0f1a0f 100%)',
            borderRadius: 14,
            padding: 20,
            border: '1px solid #2d4a2d',
          }}>
            <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 22, margin: '0 0 6px', color: '#c9a227', textAlign: 'center' }}>
              Hand Rankings
            </h2>
            <p style={{ color: '#6b7b6b', fontSize: 15, margin: '0 0 18px', textAlign: 'center' }}>
              #1 is best → #10 is worst
            </p>
            {HANDS.map(hand => <HandCard key={hand.rank} hand={hand} />)}
          </div>
        )}

        {/* TIPS */}
        {view === 'tips' && (
          <div>
            <div style={{
              background: 'linear-gradient(180deg, #1a2e1a 0%, #0f1a0f 100%)',
              borderRadius: 14,
              padding: 20,
              border: '1px solid #2d4a2d',
              marginBottom: 18,
            }}>
              <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 22, margin: '0 0 6px', color: '#c9a227', textAlign: 'center' }}>
                Quick Tips
              </h2>
              <p style={{ color: '#6b7b6b', fontSize: 15, margin: '0 0 18px', textAlign: 'center' }}>
                Basic strategy for beginners
              </p>
              {QUICK_TIPS.map((tip, i) => (
                <div key={i} style={{ padding: '14px 0', borderBottom: i < QUICK_TIPS.length - 1 ? '1px solid #2d4a2d' : 'none' }}>
                  <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 17, marginBottom: 4, color: '#f4e4a6' }}>{tip.title}</div>
                  <div style={{ color: '#a8c4a8', fontSize: 15, lineHeight: 1.5 }}>{tip.desc}</div>
                </div>
              ))}
            </div>
            
            <div style={{
              background: 'radial-gradient(ellipse at center, #1e5631 0%, #0d2818 70%)',
              borderRadius: 12,
              padding: 18,
              border: '2px solid #c9a227',
            }}>
              <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 18, margin: '0 0 8px', color: '#c9a227' }}>
                The Ace Rule
              </h3>
              <p style={{ fontSize: 15, lineHeight: 1.6, margin: 0, color: '#a8c4a8' }}>
                Ace can be <strong style={{ color: '#f4e4a6' }}>high</strong> (A-K-Q-J-10) or <strong style={{ color: '#f4e4a6' }}>low</strong> (A-2-3-4-5), but not both. K-A-2-3-4 is not a valid straight.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer style={{ textAlign: 'center', marginTop: 32, paddingTop: 16, borderTop: '1px solid #2d4a2d' }}>
          <p style={{ color: '#4a5a4a', fontSize: 12, fontStyle: 'italic', margin: 0 }}>
            100% vibe coded by Marina + Claude
          </p>
        </footer>
      </div>
    </div>
  );
}

// Hand Card Component
const HandCard = ({ hand }) => {
  const [open, setOpen] = useState(false);
  const isTop = hand.rank <= 3;
  const isMid = hand.rank > 3 && hand.rank <= 6;
  
  return (
    <div style={{ borderBottom: '1px solid #2d4a2d', paddingBottom: 14, marginBottom: 14 }}>
      <div onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: isTop ? 'linear-gradient(180deg, #c9a227 0%, #8b6914 100%)' : isMid ? 'linear-gradient(180deg, #6b7280 0%, #4b5563 100%)' : '#2d4a2d',
          color: isTop ? '#1a1a2e' : isMid ? '#fff' : '#6b7b6b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Cinzel', serif",
          fontWeight: 700,
          fontSize: 16,
        }}>
          {hand.rank}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 17, color: isTop ? '#c9a227' : '#e8e4d9' }}>{hand.name}</div>
          <div style={{ color: '#6b7b6b', fontSize: 14 }}>{hand.desc}</div>
        </div>
        <div style={{ color: '#4a6b4a', fontSize: 20, transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▾</div>
      </div>
      
      {open && (
        <div style={{ marginTop: 14, paddingLeft: 50 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {hand.example.map((c, i) => <Card key={i} card={c} small />)}
          </div>
          <div style={{ background: '#0d2818', borderRadius: 8, padding: '12px 14px', fontSize: 14, color: '#a8c4a8', borderLeft: '3px solid #c9a227' }}>
            {hand.tip}
          </div>
        </div>
      )}
    </div>
  );
};
