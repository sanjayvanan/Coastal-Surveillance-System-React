// Minimal S-52 Conditional Symbology evaluator focused on buoys & beacons.
// Path: src/s52/cs-evaluator.js

// --- Helpers ---------------------------------------------------------------

function pick(...vals) {
  for (const v of vals) if (v !== null && v !== undefined && v !== '') return v;
  return undefined;
}

// Normalize ENC attributes (incoming properties can be lowercase/uppercase)
function normProps(p = {}) {
  const out = {};
  for (const k of Object.keys(p)) out[k.toUpperCase()] = p[k];
  return out;
}

// Turn COLOUR/COLOUR2/etc into array of ints (S-57 uses int codes)
function parseColours(propsU) {
  const cols = [];
  for (const key of ['COLOUR', 'COLOUR1', 'COLOUR2', 'COLOUR3']) {
    const v = propsU[key];
    if (v === undefined) continue;
    if (Array.isArray(v)) cols.push(...v.map(Number));
    else cols.push(Number(v));
  }
  return cols.filter((n) => !Number.isNaN(n));
}

// --- Symbol tables (subset of S-52 common symbol IDs) ----------------------
// These IDs must exist in your spritesheet (symbols.json).
const BOY_SHAPE_TO_SYMBOL = {
  // BOYSHP values: 1=can, 2=conical, 3=spherical, 4=pillar, 5=spar, 6=barrel
  1: 'BOYCAN62',
  2: 'BOYCON62',
  3: 'BOYSPH62',
  4: 'BOYPIL62',
  5: 'BOYSPR62',
  6: 'BOYBAR62',
};

const BCN_SHAPE_TO_SYMBOL = {
  // BCNSHP values: 1=stake, 3=tower, 4=pile, 5=pole (generic)
  1: 'BCNSTK79',
  3: 'BCNTOW71',
  4: 'BCNPIL01',
  5: 'BCNGEN01',
};

// --- Colour logic (very minimal) ------------------------------------------
function lateralSystemPrimaryColour(propsU) {
  // S-52 colour codes (subset): 3=red, 4=green, 6=yellow, 14=black, 1=white
  const cols = parseColours(propsU);
  if (cols.includes(3)) return 'RED';
  if (cols.includes(4)) return 'GRN';
  if (cols.includes(6)) return 'YEL';
  if (cols.includes(14)) return 'BLK';
  if (cols.includes(1)) return 'WHT';
  return 'UNK';
}

// For lateral buoys, prefer shape-specific symbol; fall back to generic color family.
function boylatSymbol(propsU) {
  const shp = Number(pick(propsU.BOYSHP, propsU.SHAPE));
  const base = BOY_SHAPE_TO_SYMBOL[shp];
  if (base) return base;

  // Fallback by colour
  switch (lateralSystemPrimaryColour(propsU)) {
    case 'RED': return 'BOYGEN03';
    case 'GRN': return 'BOYGEN02';
    case 'YEL': return 'BOYGEN01';
    default: return 'BOYGEN03'; // generic
  }
}

function bcnlatSymbol(propsU) {
  const shp = Number(pick(propsU.BCNSHP, propsU.SHAPE));
  return BCN_SHAPE_TO_SYMBOL[shp] || 'BCNGEN01';
}

// Isolated danger buoy/beacon quick picks (very common)
function boyisdSymbol() { return 'BOYISD11'; }
function bcnisdSymbol() { return 'BCNISD11'; }

// Safe water
function boysawSymbol() { return 'BOYSAW12'; }
function bcnsawSymbol() { return 'BCNSAW13'; }

// Special purpose
function boysppSymbol() { return 'BOYSPP13'; }
function bcnsppSymbol() { return 'BCNSPP13'; }

// Cardinal buoys – generic fallback
function boyCardinalSymbol() { return 'BOYCAR01'; }
function bcnCardinalSymbol() { return 'BCNCAR01'; }

// --- CS Evaluator ----------------------------------------------------------
// Returns an array of SY(...) symbol IDs in draw order.
export function evaluateCS(csName, featureProps) {
  const propsU = normProps(featureProps || {});
  const n = (csName || '').toUpperCase();

  switch (n) {
    case 'BOYLAT':
      return [boylatSymbol(propsU)];

    case 'BCNLAT':
      return [bcnlatSymbol(propsU)];

    case 'BOYISD':
    case 'OBSTRN04': // common rule mapping to isolated danger style for obstructions
      return [boyisdSymbol()];

    case 'BCNISD':
      return [bcnisdSymbol()];

    case 'BOYSAW':
      return [boysawSymbol()];

    case 'BCNSAW':
      return [bcnsawSymbol()];

    case 'BOYSPP':
      return [boysppSymbol()];

    case 'BCNSPP':
      return [bcnsppSymbol()];

    case 'BOYCAR':
    case 'CARDINAL_BUOY':
      return [boyCardinalSymbol()];

    case 'BCNCAR':
    case 'CARDINAL_BEACON':
      return [bcnCardinalSymbol()];

    default:
      // Unknown CS: return empty so caller can fall back to explicit SY(...) in rule text.
      return [];
  }
}
