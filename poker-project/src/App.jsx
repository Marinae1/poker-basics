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
  { weight: 12, generator: generatePremiumPair },
  { weight: 15, generator: generateFlushDraw },
  { weight: 12, generator: generateStraightDraw },
  { weight: 10, generator: generateSetOnFlop },
  { weight: 12, generator: generateTwoPair },
  { weight: 8, generator: generateMonster },
  { weight: 10, generator: generateSuitedConnectors },
  { weight: 8, generator: generateBigSlick },
  { weight: 5, generator: generateCooler },
  { weight: 8, generator: generateRandom },
];

function pickScenario() {
  const totalWeight = SCENARIO_TYPES.reduce((sum, s) => sum + s.weight, 0);
  let random = Math.random() * totalWeight;
  for (const scenario of SCENARIO_TYPES) {
    random -= scenario.weight;
    if (random <= 0) return scenario;
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

function generateMonster() {
  const monsterType = Math.random();
  if (monsterType < 0.5) {
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
    return { hole, community: [...shuffleArray(flop), ...remaining] };
  } else if (monsterType < 0.8) {
    const rank = getRandomRank();
    const hole = [makeCard(rank, '♠'), makeCard(rank, '♥')];
    const flop = [
      makeCard(rank, '♦'),
      makeCard(rank, '♣'),
      makeCard(getRandomRank([rank]), getRandomSuit())
    ];
    const remaining = fillRemainingCards(hole, flop, 2);
    return { hole, community: [...shuffleArray(flop), ...remaining] };
  } else {
    const suit = getRandomSuit();
    const startIdx = Math.floor(Math.random() * 9) + 1;
    const sfRanks = RANKS.slice(startIdx, startIdx + 5).reverse();
    if (sfRanks.length < 5) return generateMonster();
    const hole = [makeCard(sfRanks[0], suit), makeCard(sfRanks[1], suit)];
    const flop = [
      makeCard(sfRanks[2], suit),
      makeCard(sfRanks[3], suit),
      makeCard(getRandomRank(sfRanks), getRandomSuit([suit]))
    ];
    const turn = makeCard(sfRanks[4], suit);
    const remaining = fillRemainingCards(hole, [...flop, turn], 1);
    return { hole, community: [...shuffleArray(flop), turn, remaining[0]] };
  }
}

function generateSuitedConnectors() {
  const suit = getRandomSuit();
  const startIdx = Math.floor(Math.random() * 8) + 2;
  const hole = [makeCard(RANKS[startIdx], suit), makeCard(RANKS[startIdx + 1], suit)];
  const community = fillRemainingCards(hole, [], 5);
  return { hole, community };
}

function generateBigSlick() {
  const suited = Math.random() > 0.5;
  const suit1 = getRandomSuit();
  const suit2 = suited ? suit1 : getRandomSuit([suit1]);
  const hole = [makeCard('A', suit1), makeCard('K', suit2)];
  const hitType = Math.random();
  let flop;
  if (hitType < 0.4) {
    const hitRank = Math.random() > 0.5 ? 'A' : 'K';
    flop = [
      makeCard(hitRank, getRandomSuit([suit1, suit2])),
      makeCard(getRandomRank(['A', 'K']), getRandomSuit()),
      makeCard(getRandomRank(['A', 'K']), getRandomSuit())
    ];
  } else {
    flop = fillRemainingCards(hole, [], 3).filter(c => c.rank !== 'A' && c.rank !== 'K').slice(0, 3);
    if (flop.length < 3) flop = fillRemainingCards(hole, [], 3);
  }
  const remaining = fillRemainingCards(hole, flop, 2);
  return { hole, community: [...flop, ...remaining] };
}

function generateCooler() {
  const coolerType = Math.random();
  if (coolerType < 0.5) {
    const rank = getRandomRank(['A', 'K']);
    const suits = shuffleArray([...SUITS]);
    const hole = [makeCard(rank, suits[0]), makeCard(rank, suits[1])];
    const higherRank = RANKS[RANKS.indexOf(rank) - 1] || 'A';
    const flop = [
      makeCard(rank, suits[2]),
      makeCard(higherRank, getRandomSuit()),
      makeCard(higherRank, getRandomSuit())
    ];
    const remaining = fillRemainingCards(hole, flop, 2);
    return { hole, community: [...shuffleArray(flop), ...remaining] };
  } else {
    const suit = getRandomSuit();
    const ranks = shuffleArray([...RANKS]);
    const hole = [makeCard(ranks[5], suit), makeCard(ranks[6], suit)];
    const flop = [
      makeCard(ranks[0], suit),
      makeCard(ranks[7], suit),
      makeCard(ranks[8], suit)
    ];
    const remaining = fillRemainingCards(hole, flop, 2);
    return { hole, community: [...shuffleArray(flop), ...remaining] };
  }
}

function generateRandom() {
  const deck = [];
  SUITS.forEach(suit => RANKS.forEach(rank => deck.push(makeCard(rank, suit))));
  const shuffled = shuffleArray(deck);
  return { hole: [shuffled[0], shuffled[1]], community: shuffled.slice(2, 7) };
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
  const width = small ? 56 : 72;
  const height = small ? 84 : 108;
  
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
  
  const cornerFontSize = small ? 12 : 15;
  const centerFontSize = small ? 28 : 36;
  
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
        padding: '12px 24px',
        borderRadius: 8,
        fontFamily: "'Cinzel', Georgia, serif",
        fontSize: 14,
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
      fontSize: 16,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Lato:wght@400;700&display=swap');
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
      
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 20px' }}>
        
        {/* Header */}
        <header style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 24 }}>♠</span>
            <span style={{ fontSize: 24, color: '#c41e3a' }}>♥</span>
            <span style={{ fontSize: 24, color: '#c41e3a' }}>♦</span>
            <span style={{ fontSize: 24 }}>♣</span>
          </div>
          <h1 style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 30,
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
          <p style={{ color: '#6b7b6b', fontSize: 12, marginTop: 6, letterSpacing: '2px', textTransform: 'uppercase' }}>
            Learn to Play
          </p>
        </header>

        {/* Navigation */}
        <nav style={{
          display: 'flex',
          gap: 4,
          marginBottom: 20,
          padding: 4,
          background: 'linear-gradient(180deg, #1a2e1a 0%, #0f1a0f 100%)',
          borderRadius: 10,
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
                padding: '12px 8px',
                border: 'none',
                borderRadius: 8,
                background: view === tab.id ? 'linear-gradient(180deg, #c9a227 0%, #8b6914 100%)' : 'transparent',
                color: view === tab.id ? '#1a1a2e' : '#6b7b6b',
                fontFamily: "'Cinzel', serif",
                fontSize: 13,
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
              borderRadius: 16,
              padding: 30,
              border: '6px solid #2c1810',
              boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5), 0 0 0 2px #c9a227',
              marginBottom: 20,
            }}>
              <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 20, margin: '0 0 10px', color: '#f4e4a6' }}>
                How Poker Works (At a Glance)
              </h2>
              <p style={{ color: '#a8c4a8', fontSize: 15, lineHeight: 1.6, margin: '0 0 14px' }}>
                The goal is to win the pot by making the best 5-card hand or by getting everyone else to fold.
              </p>
              <div style={{ display: 'grid', gap: 8, marginBottom: 18, textAlign: 'left' }}>
                <div style={{ color: '#e8e4d9', fontSize: 14 }}>
                  • You get <strong style={{ color: '#f4e4a6' }}>2 private cards</strong> (only you see these).
                </div>
                <div style={{ color: '#e8e4d9', fontSize: 14 }}>
                  • <strong style={{ color: '#f4e4a6' }}>5 community cards</strong> are shared: flop (3), turn (1), river (1).
                </div>
                <div style={{ color: '#e8e4d9', fontSize: 14 }}>
                  • Combine your 2 + the 5 community cards to make your <strong style={{ color: '#f4e4a6' }}>best 5-card hand</strong>.
                </div>
                <div style={{ color: '#e8e4d9', fontSize: 14 }}>
                  • Betting rounds happen after each reveal.
                </div>
              </div>
              <Button onClick={startGame}>Start Practice</Button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div onClick={() => setView('hands')} style={{
                background: 'linear-gradient(180deg, #1a2e1a 0%, #0f1a0f 100%)',
                borderRadius: 10,
                padding: 14,
                cursor: 'pointer',
                border: '1px solid #2d4a2d',
              }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>📚</div>
                <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 12, color: '#c9a227' }}>Hand Rankings</div>
                <div style={{ color: '#6b7b6b', fontSize: 11, marginTop: 2 }}>What beats what</div>
              </div>
              <div onClick={() => setView('tips')} style={{
                background: 'linear-gradient(180deg, #1a2e1a 0%, #0f1a0f 100%)',
                borderRadius: 10,
                padding: 14,
                cursor: 'pointer',
                border: '1px solid #2d4a2d',
              }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>💡</div>
                <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 12, color: '#c9a227' }}>Quick Tips</div>
                <div style={{ color: '#6b7b6b', fontSize: 11, marginTop: 2 }}>Basic strategy</div>
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
              borderRadius: 16,
              padding: 18,
              border: '6px solid #2c1810',
              boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5), 0 0 0 2px #c9a227',
              marginBottom: 14,
            }}>
              {/* Stage */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 6,
                marginBottom: 14,
              }}>
                {['preflop', 'flop', 'turn', 'river'].map((s, i) => (
                  <React.Fragment key={s}>
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: ['preflop', 'flop', 'turn', 'river'].indexOf(stage) >= i ? '#c9a227' : '#2d4a2d',
                      boxShadow: ['preflop', 'flop', 'turn', 'river'].indexOf(stage) >= i ? '0 0 6px #c9a227' : 'none',
                    }} />
                    {i < 3 && <div style={{ width: 16, height: 2, background: ['preflop', 'flop', 'turn', 'river'].indexOf(stage) > i ? '#c9a227' : '#2d4a2d' }} />}
                  </React.Fragment>
                ))}
              </div>
              
              <div style={{ textAlign: 'center', marginBottom: 10, fontFamily: "'Cinzel', serif", fontSize: 10, color: '#c9a227', letterSpacing: '2px', textTransform: 'uppercase' }}>
                {stage === 'preflop' ? 'Pre-Flop' : stage.charAt(0).toUpperCase() + stage.slice(1)}
              </div>

              {/* Community Cards */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', minHeight: 96, alignItems: 'center', flexWrap: 'wrap' }}>
                  {stage === 'preflop' ? (
                    <div style={{ color: '#4a6b4a', fontSize: 12, fontStyle: 'italic' }}>Community cards will appear here</div>
                  ) : (
                    <>
                      {visibleCommunity.map((c, i) => <Card key={i} card={c} highlight={winningCardIds.has(c.id)} />)}
                      {[...Array(5 - visibleCommunity.length)].map((_, i) => <Card key={`e${i}`} faceDown />)}
                    </>
                  )}
                </div>
              </div>

              <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #3d5a3d, transparent)', margin: '0 12px 14px' }} />

              {/* Your Cards */}
              <div>
                <div style={{ fontSize: 9, fontFamily: "'Cinzel', serif", color: '#6b7b6b', textAlign: 'center', marginBottom: 8, letterSpacing: '2px', textTransform: 'uppercase' }}>
                  Your Cards
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  {gameData.hole.map((c, i) => <Card key={i} card={c} highlight={winningCardIds.has(c.id)} />)}
                </div>
              </div>
            </div>

            {/* Current Hand Display - shows progress during play, reveals final hand at river */}
            {result && !isRiver && (
              <div style={{
                background: 'linear-gradient(180deg, #1a2e1a 0%, #0f1a0f 100%)',
                borderRadius: 10,
                padding: 12,
                textAlign: 'center',
                marginBottom: 14,
                border: '1px solid #2d4a2d',
              }}>
                <div style={{ fontSize: 10, color: '#6b7b6b', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 2 }}>
                  Current Hand
                </div>
                <div style={{ fontSize: 16, fontFamily: "'Cinzel', serif", fontWeight: 700, color: '#a8c4a8' }}>
                  {result.name}
                </div>
                <div style={{ marginTop: 4, color: '#6b7b6b', fontSize: 11 }}>
                  Keep dealing to see your final hand...
                </div>
              </div>
            )}

            {/* Final Hand Reveal at River */}
            {result && isRiver && (
              <div style={{
                background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)',
                borderRadius: 10,
                padding: 16,
                textAlign: 'center',
                marginBottom: 14,
                border: '2px solid #c9a227',
                boxShadow: '0 0 20px rgba(201,162,39,0.3)',
              }}>
                <div style={{ fontSize: 10, color: '#c9a227', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 4 }}>
                  🎉 Your Final Hand
                </div>
                <div style={{ fontSize: 22, fontFamily: "'Cinzel', serif", fontWeight: 700, color: '#f4e4a6' }}>
                  {result.name}
                </div>
                {handInfo && (
                  <div style={{ marginTop: 8, color: '#a8c4a8', fontSize: 13, lineHeight: 1.5 }}>
                    {handInfo.desc}. {handInfo.tip}
                  </div>
                )}
                <div style={{ marginTop: 10, color: '#6b7b6b', fontSize: 11, fontStyle: 'italic' }}>
                  The glowing cards show which 5 cards make your best hand!
                </div>
              </div>
            )}

            {/* Controls */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
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
            borderRadius: 12,
            padding: 14,
            border: '1px solid #2d4a2d',
          }}>
            <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 16, margin: '0 0 4px', color: '#c9a227', textAlign: 'center' }}>
              Hand Rankings
            </h2>
            <p style={{ color: '#6b7b6b', fontSize: 12, margin: '0 0 14px', textAlign: 'center' }}>
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
              borderRadius: 12,
              padding: 14,
              border: '1px solid #2d4a2d',
              marginBottom: 14,
            }}>
              <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 16, margin: '0 0 4px', color: '#c9a227', textAlign: 'center' }}>
                Quick Tips
              </h2>
              <p style={{ color: '#6b7b6b', fontSize: 12, margin: '0 0 14px', textAlign: 'center' }}>
                Basic strategy for beginners
              </p>
              {QUICK_TIPS.map((tip, i) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: i < QUICK_TIPS.length - 1 ? '1px solid #2d4a2d' : 'none' }}>
                  <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 13, marginBottom: 3, color: '#f4e4a6' }}>{tip.title}</div>
                  <div style={{ color: '#a8c4a8', fontSize: 12, lineHeight: 1.5 }}>{tip.desc}</div>
                </div>
              ))}
            </div>
            
            <div style={{
              background: 'radial-gradient(ellipse at center, #1e5631 0%, #0d2818 70%)',
              borderRadius: 10,
              padding: 14,
              border: '2px solid #c9a227',
            }}>
              <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 14, margin: '0 0 6px', color: '#c9a227' }}>
                The Ace Rule
              </h3>
              <p style={{ fontSize: 12, lineHeight: 1.6, margin: 0, color: '#a8c4a8' }}>
                Ace can be <strong style={{ color: '#f4e4a6' }}>high</strong> (A-K-Q-J-10) or <strong style={{ color: '#f4e4a6' }}>low</strong> (A-2-3-4-5), but not both. K-A-2-3-4 is not a valid straight.
              </p>
            </div>
          </div>
        )}
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
    <div style={{ borderBottom: '1px solid #2d4a2d', paddingBottom: 10, marginBottom: 10 }}>
      <div onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          background: isTop ? 'linear-gradient(180deg, #c9a227 0%, #8b6914 100%)' : isMid ? 'linear-gradient(180deg, #6b7280 0%, #4b5563 100%)' : '#2d4a2d',
          color: isTop ? '#1a1a2e' : isMid ? '#fff' : '#6b7b6b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Cinzel', serif",
          fontWeight: 700,
          fontSize: 12,
        }}>
          {hand.rank}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 13, color: isTop ? '#c9a227' : '#e8e4d9' }}>{hand.name}</div>
          <div style={{ color: '#6b7b6b', fontSize: 11 }}>{hand.desc}</div>
        </div>
        <div style={{ color: '#4a6b4a', fontSize: 16, transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▾</div>
      </div>
      
      {open && (
        <div style={{ marginTop: 10, paddingLeft: 38 }}>
          <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
            {hand.example.map((c, i) => <Card key={i} card={c} small />)}
          </div>
          <div style={{ background: '#0d2818', borderRadius: 6, padding: '8px 10px', fontSize: 11, color: '#a8c4a8', borderLeft: '3px solid #c9a227' }}>
            {hand.tip}
          </div>
        </div>
      )}
    </div>
  );
};
