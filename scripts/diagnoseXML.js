// scripts/diagnoseXML.js - Debug chartsymbols.xml structure
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseStringPromise } from 'xml2js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SYMBOLS_XML_PATH = path.join(__dirname, '../public/s57data/chartsymbols.xml');

console.log('🔍 Diagnosing chartsymbols.xml structure...\n');

async function diagnoseXML() {
  try {
    const xmlContent = fs.readFileSync(SYMBOLS_XML_PATH, 'utf-8');
    console.log('✅ File loaded successfully');
    console.log(`📏 File size: ${(xmlContent.length / 1024).toFixed(2)} KB\n`);

    // Parse with xml2js
    const result = await parseStringPromise(xmlContent, {
      explicitArray: false,
      mergeAttrs: true
    });

    console.log('🔍 Root structure:');
    console.log(Object.keys(result));
    console.log();

    // Check what's in chartsymbols
    if (result.chartsymbols) {
      console.log('📦 chartsymbols contents:');
      console.log(Object.keys(result.chartsymbols));
      console.log();

      // Check symbols section
      if (result.chartsymbols.symbols) {
        console.log('🎨 Symbols section found!');
        console.log('Type:', typeof result.chartsymbols.symbols);
        console.log('Keys:', Object.keys(result.chartsymbols.symbols));
        console.log();

        // Check symbol structure
        if (result.chartsymbols.symbols.symbol) {
          const symbols = Array.isArray(result.chartsymbols.symbols.symbol)
            ? result.chartsymbols.symbols.symbol
            : [result.chartsymbols.symbols.symbol];

          console.log(`📊 Found ${symbols.length} symbol entries`);
          console.log();
          
          // Show first 3 symbols in detail
          console.log('🔬 First 3 symbol structures:\n');
          symbols.slice(0, 3).forEach((sym, idx) => {
            console.log(`Symbol ${idx + 1}:`);
            console.log(JSON.stringify(sym, null, 2));
            console.log('\n---\n');
          });
        } else {
          console.log('❌ No symbol property found in symbols section');
          console.log('Available properties:', Object.keys(result.chartsymbols.symbols));
        }
      } else {
        console.log('❌ No symbols section found');
      }

      // Check lookups section
      if (result.chartsymbols.lookups) {
        console.log('📋 Lookups section found!');
        
        if (result.chartsymbols.lookups.lookup) {
          const lookups = Array.isArray(result.chartsymbols.lookups.lookup)
            ? result.chartsymbols.lookups.lookup
            : [result.chartsymbols.lookups.lookup];
          
          console.log(`📊 Found ${lookups.length} lookup entries`);
          console.log();
          
          // Show first lookup in detail
          console.log('🔬 First lookup structure:\n');
          console.log(JSON.stringify(lookups[0], null, 2));
        }
      }

      // Check line-styles
      if (result.chartsymbols['line-styles']) {
        console.log('\n📏 Line-styles section found!');
        const lineStyles = result.chartsymbols['line-styles'];
        console.log('Keys:', Object.keys(lineStyles));
      }

      // Check patterns
      if (result.chartsymbols.patterns) {
        console.log('\n🎨 Patterns section found!');
        const patterns = result.chartsymbols.patterns;
        console.log('Keys:', Object.keys(patterns));
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

diagnoseXML();