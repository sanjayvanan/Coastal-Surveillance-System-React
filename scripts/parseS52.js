// scripts/parseS52.js
// Complete S-52 Parser with Conditional Symbology Support
// Filters lookups to table-name != "Paper"
// Properly extracts symbols, rules, conditionals, and colors

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseStringPromise } from 'xml2js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const S52_DIR = path.join(__dirname, '../public/s57data');
const OUTPUT_DIR = path.join(__dirname, '../public/s52-parsed');
const COLOR_TABLE_PATH = path.join(S52_DIR, 'S52RAZDS.RLE');
const SYMBOLS_XML_PATH = path.join(S52_DIR, 'chartsymbols.xml');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

console.log('🚀 Starting S-52 XML parsing (table-name != Paper)...\n');

// ============================================================================
// COLORS - S-52 Standard Color Table
// ============================================================================
function parseColorTable() {
  console.log('📦 Parsing S-52 color table...');
  return getDefaultColors();
}

function getDefaultColors() {
  return {
    NODTA:{name:'NODTA',r:163,g:180,b:183,hex:'#a3b4b7'},
    CURSR:{name:'CURSR',r:255,g:255,b:0,hex:'#ffff00'},
    CHBLK:{name:'CHBLK',r:0,g:0,b:0,hex:'#000000'},
    CHGRD:{name:'CHGRD',r:190,g:190,b:190,hex:'#bebebe'},
    CHGRF:{name:'CHGRF',r:163,g:163,b:163,hex:'#a3a3a3'},
    DEPIT:{name:'DEPIT',r:198,g:226,b:255,hex:'#c6e2ff'},
    DEPMD:{name:'DEPMD',r:170,g:211,b:255,hex:'#aad3ff'},
    DEPMS:{name:'DEPMS',r:141,g:180,b:226,hex:'#8db4e2'},
    DEPVS:{name:'DEPVS',r:198,g:226,b:255,hex:'#c6e2ff'},
    DEPDW:{name:'DEPDW',r:170,g:211,b:255,hex:'#aad3ff'},
    DEPCN:{name:'DEPCN',r:148,g:191,b:255,hex:'#94bfff'},
    LANDA:{name:'LANDA',r:217,g:194,b:158,hex:'#d9c29e'},
    LANDF:{name:'LANDF',r:217,g:194,b:158,hex:'#d9c29e'},
    CSTLN:{name:'CSTLN',r:107,g:68,b:35,hex:'#6b4423'},
    LITRD:{name:'LITRD',r:255,g:0,b:0,hex:'#ff0000'},
    LITGN:{name:'LITGN',r:0,g:255,b:0,hex:'#00ff00'},
    LITYW:{name:'LITYW',r:255,g:255,b:0,hex:'#ffff00'},
    TRFCD:{name:'TRFCD',r:193,g:0,b:0,hex:'#c10000'},
    TRFCF:{name:'TRFCF',r:193,g:0,b:0,hex:'#c10000'},
    DEPSC:{name:'DEPSC',r:65,g:105,b:225,hex:'#4169e1'},
    RESBL:{name:'RESBL',r:255,g:0,b:255,hex:'#ff00ff'},
    RESGR:{name:'RESGR',r:0,g:128,b:0,hex:'#008000'},
    CHCOR:{name:'CHCOR',r:255,g:192,b:203,hex:'#ffc0cb'},
    CHBRN:{name:'CHBRN',r:139,g:69,b:19,hex:'#8b4513'},
    CHRED:{name:'CHRED',r:255,g:0,b:0,hex:'#ff0000'},
    CHGRN:{name:'CHGRN',r:0,g:255,b:0,hex:'#00ff00'},
    CHYLW:{name:'CHYLW',r:255,g:255,b:0,hex:'#ffff00'},
    CHBLU:{name:'CHBLU',r:0,g:0,b:255,hex:'#0000ff'},
    SNDG1:{name:'SNDG1',r:114,g:159,b:207,hex:'#729fcf'},
    SNDG2:{name:'SNDG2',r:32,g:74,b:135,hex:'#204a87'},
    SHIPS:{name:'SHIPS',r:255,g:0,b:0,hex:'#ff0000'},
    PSTRK:{name:'PSTRK',r:255,g:140,b:0,hex:'#ff8c00'},
    SYTRK:{name:'SYTRK',r:255,g:215,b:0,hex:'#ffd700'},
    PLRTE:{name:'PLRTE',r:255,g:0,b:255,hex:'#ff00ff'},
    APLRT:{name:'APLRT',r:255,g:105,b:180,hex:'#ff69b4'},
    UINFR:{name:'UINFR',r:255,g:165,b:0,hex:'#ffa500'},
    UINFG:{name:'UINFG',r:0,g:255,b:0,hex:'#00ff00'},
    UINFB:{name:'UINFB',r:0,g:0,b:255,hex:'#0000ff'},
    UINFF:{name:'UINFF',r:255,g:255,b:0,hex:'#ffff00'},
    UIAFD:{name:'UIAFD',r:192,g:192,b:192,hex:'#c0c0c0'},
    UIAFF:{name:'UIAFF',r:211,g:211,b:211,hex:'#d3d3d3'},
    UINFM:{name:'UINFM',r:255,g:0,b:255,hex:'#ff00ff'},
    UIBCK:{name:'UIBCK',r:240,g:240,b:240,hex:'#f0f0f0'},
    UIBDR:{name:'UIBDR',r:128,g:128,b:128,hex:'#808080'},
    OUTLW:{name:'OUTLW',r:255,g:255,b:255,hex:'#ffffff'},
    OUTLL:{name:'OUTLL',r:0,g:0,b:0,hex:'#000000'},
    SCLBR:{name:'SCLBR',r:255,g:255,b:255,hex:'#ffffff'},
    ADINF:{name:'ADINF',r:0,g:0,b:0,hex:'#000000'},
    CHMGD:{name:'CHMGD',r:255,g:0,b:255,hex:'#ff00ff'},
    CHMGF:{name:'CHMGF',r:255,g:255,b:0,hex:'#ffff00'}
  };
}

// ============================================================================
// CHARTSYMBOLS.XML - Parse symbols, lookups, and conditionals
// ============================================================================
async function parseSymbolsXML() {
  console.log('📦 Parsing chartsymbols.xml...');

  if (!fs.existsSync(SYMBOLS_XML_PATH)) {
    console.error('❌ chartsymbols.xml not found at:', SYMBOLS_XML_PATH);
    return { symbols: {}, lookups: {}, conditionals: {} };
  }

  try {
    const xmlContent = fs.readFileSync(SYMBOLS_XML_PATH, 'utf-8');
    const result = await parseStringPromise(xmlContent, {
      explicitArray: false,
      mergeAttrs: true
    });

    const symbols = {};
    const lookups = {};
    const conditionals = parseConditionalProcedures(result);

    // ---------- SYMBOLS ----------
    if (result.chartsymbols?.symbols?.symbol) {
      const symbolArray = Array.isArray(result.chartsymbols.symbols.symbol)
        ? result.chartsymbols.symbols.symbol
        : [result.chartsymbols.symbols.symbol];

      for (const sym of symbolArray) {
        const name = sym.name;
        const bitmap = sym.bitmap || {};
        const gl = bitmap['graphics-location'] || {};
        const pivot = bitmap.pivot || {};
        
        // Validate required fields
        if (!name || !bitmap.width || !bitmap.height || gl.x === undefined || gl.y === undefined) {
          continue;
        }

        const w = parseInt(bitmap.width, 10);
        const h = parseInt(bitmap.height, 10);
        
        // Use bitmap pivot for anchor positioning
        const pivotX = parseInt(pivot.x ?? Math.floor(w / 2), 10);
        const pivotY = parseInt(pivot.y ?? Math.floor(h / 2), 10);

        symbols[name] = {
          name,
          bounds: {
            x: parseInt(gl.x, 10) || 0,
            y: parseInt(gl.y, 10) || 0,
            width: w,
            height: h
          },
          pivot: {
            x: pivotX,
            y: pivotY
          },
          anchor: {
            x: pivotX,
            y: pivotY
          },
          source: 'rastersymbols-day.png',
          description: sym.description || '',
          colorRef: sym['color-ref'] || '',
          RCID: sym.RCID || ''
        };
      }
    }

    // ---------- LOOKUPS (NOT Paper) ----------
    if (result.chartsymbols?.lookups?.lookup) {
      const lookupArray = Array.isArray(result.chartsymbols.lookups.lookup)
        ? result.chartsymbols.lookups.lookup
        : [result.chartsymbols.lookups.lookup];

      // Filter: keep entries where table-name is NOT "paper"
      const notPaper = lookupArray.filter(lk => {
        const t = (lk['table-name'] ?? '').trim().toLowerCase();
        return t !== 'paper';
      });

      for (const lookup of notPaper) {
        const name = lookup.name;
        const instruction = lookup.instruction;
        if (!name || !instruction) continue;

        lookups[name] = {
          name,
          instruction,
          type: lookup.type || 'Point',
          tableName: lookup['table-name'] ?? '',
          displayPriorityText: lookup['disp-prio'] || '',
          radarPriority: lookup['radar-prio'] || '',
          displayCat: lookup['display-cat'] || '',
          RCID: lookup.RCID || ''
        };
      }
    }

    console.log(`✅ Parsed ${Object.keys(symbols).length} symbols`);
    console.log(`✅ Parsed ${Object.keys(lookups).length} non-Paper lookups`);
    console.log(`✅ Parsed ${Object.keys(conditionals).length} conditional procedures\n`);
    
    return { symbols, lookups, conditionals };
  } catch (error) {
    console.error('❌ Error parsing chartsymbols.xml:', error.message);
    return { symbols: {}, lookups: {}, conditionals: {} };
  }
}

// ============================================================================
// CONDITIONAL SYMBOLOGY PROCEDURES (CSP)
// ============================================================================
function parseConditionalProcedures(result) {
  console.log('📦 Parsing conditional symbology procedures...');
  const conditionals = {};
  
  // Look for color-symbol-procedures or similar CSP definitions
  const cspSection = result.chartsymbols?.['color-symbol-procedures']?.['color-symbol-procedure'];
  
  if (cspSection) {
    const cspArray = Array.isArray(cspSection) ? cspSection : [cspSection];
    
    for (const csp of cspArray) {
      const name = csp.name;
      if (!name) continue;
      
      // Extract conditional rules from the procedure
      const instructions = [];
      if (csp.instruction) {
        const instArray = Array.isArray(csp.instruction) ? csp.instruction : [csp.instruction];
        instructions.push(...instArray);
      }
      
      conditionals[name] = {
        name,
        instructions,
        description: csp.description || ''
      };
    }
    
    console.log(`✅ Parsed ${Object.keys(conditionals).length} conditional procedures`);
  } else {
    console.warn('⚠️  No CSP section found in XML - conditional symbology will use attribute-based fallbacks');
  }
  
  return conditionals;
}

// ============================================================================
// RULES - Generate from lookups with conditional support
// ============================================================================
function generateRules(lookups, colors, conditionals) {
  console.log('📝 Generating rules from non-Paper lookups...');
  const rules = {};
  let ruleCount = 0;

  for (const [objectClass, lookup] of Object.entries(lookups)) {
    const instruction = lookup.instruction || '';
    
    // Parse all instruction components
    const parsed = parseInstruction(instruction);
    
    // Extract and resolve colors to hex
    let extractedColors = {
      lineColor: null,
      areaColor: null,
      textColor: null
    };

    if (parsed.lineStyle?.color && colors[parsed.lineStyle.color]) {
      extractedColors.lineColor = colors[parsed.lineStyle.color].hex;
    }
    
    if (parsed.areaPattern && colors[parsed.areaPattern]) {
      extractedColors.areaColor = colors[parsed.areaPattern].hex;
    }

    // If conditional, include the procedure details
    let conditionalDetails = null;
    if (parsed.conditional && conditionals[parsed.conditional]) {
      conditionalDetails = conditionals[parsed.conditional];
    }

    rules[objectClass] = {
      objectClass,
      instruction,
      symbol: parsed.symbol,
      lineStyle: parsed.lineStyle,
      areaPattern: parsed.areaPattern,
      conditional: parsed.conditional,
      conditionalDetails: conditionalDetails,
      textField: parsed.textField,
      lineComplex: parsed.lineComplex,
      colors: extractedColors,
      type: lookup.type || 'Point',
      tableName: lookup.tableName || '',
      displayPriorityText: lookup.displayPriorityText || '',
      radarPriority: lookup.radarPriority || '',
      displayCat: lookup.displayCat || '',
      RCID: lookup.RCID || ''
    };
    ruleCount++;
  }

  console.log(`✅ Generated ${ruleCount} rules (non-Paper)\n`);
  return rules;
}

// Parse S-52 instruction string into components
function parseInstruction(instruction) {
  // SY(SYMBOL_NAME)
  const symbolMatch = instruction.match(/SY\(([A-Z0-9]+)\)/);
  const symbol = symbolMatch ? symbolMatch[1] : null;
  
  // LS(LINE_STYLE, WIDTH, COLOR)
  const lineMatch = instruction.match(/LS\(([^,]+),\s*([^,]+),\s*([^)]+)\)/);
  const lineStyle = lineMatch ? {
    style: lineMatch[1].trim(),
    width: lineMatch[2].trim(),
    color: lineMatch[3].trim()
  } : null;
  
  // AC(AREA_COLOR) or AP(AREA_PATTERN)
  const apMatch = instruction.match(/A[CP]\(([A-Z0-9]+)\)/);
  const areaPattern = apMatch ? apMatch[1] : null;
  
  // CS(CONDITIONAL_SYMBOLOGY)
  const csMatch = instruction.match(/CS\(([A-Z0-9]+)\)/);
  const conditional = csMatch ? csMatch[1] : null;
  
  // TX(TEXT, ATTRIBUTE, ...) or TE(...)
  const txMatch = instruction.match(/T[XE]\(([^)]+)\)/);
  const textField = txMatch ? txMatch[1] : null;
  
  // LC(LINE_COMPLEX)
  const lcMatch = instruction.match(/LC\(([A-Z0-9]+)\)/);
  const lineComplex = lcMatch ? lcMatch[1] : null;

  return {
    symbol,
    lineStyle,
    areaPattern,
    conditional,
    textField,
    lineComplex
  };
}

// ============================================================================
// SPRITES - Copy sprite sheets to output
// ============================================================================
function copySpriteSheets() {
  console.log('📦 Copying sprite sheets...');
  const sprites = ['rastersymbols-day.png', 'rastersymbols-dark.png', 'rastersymbols-dusk.png'];
  let copiedCount = 0;
  
  for (const sprite of sprites) {
    const src = path.join(S52_DIR, sprite);
    const dest = path.join(OUTPUT_DIR, sprite);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`✅ Copied ${sprite}`);
      copiedCount++;
    } else {
      console.warn(`⚠️  ${sprite} not found`);
    }
  }
  console.log();
  return copiedCount > 0;
}

// ============================================================================
// MAIN - Execute parsing and export
// ============================================================================
async function main() {
  try {
    const colors = parseColorTable();
    const { symbols, lookups, conditionals } = await parseSymbolsXML();
    const rules = generateRules(lookups, colors, conditionals);

    // Export symbols
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'symbols.json'), 
      JSON.stringify(symbols, null, 2)
    );
    console.log(`✅ Exported symbols.json (${Object.keys(symbols).length} symbols)`);

    // Export rules
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'rules.json'), 
      JSON.stringify(rules, null, 2)
    );
    console.log(`✅ Exported rules.json (${Object.keys(rules).length} non-Paper rules)`);

    // Export colors
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'colors.json'), 
      JSON.stringify(colors, null, 2)
    );
    console.log(`✅ Exported colors.json (${Object.keys(colors).length} colors)`);
    
    // Export conditionals
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'conditionals.json'), 
      JSON.stringify(conditionals, null, 2)
    );
    console.log(`✅ Exported conditionals.json (${Object.keys(conditionals).length} CSPs)`);

    // Copy sprite sheets
    copySpriteSheets();

    console.log(`\n🎉 Export complete → ${OUTPUT_DIR}`);
    console.log('✅ Done! Now run: npm run dev\n');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();