// src/utils/s52Loader.js
// Enhanced S-52 loader with conditional symbology resolution

export class S52Loader {
  constructor() {
    this.symbols = null;
    this.rules = null;
    this.colors = null;
    this.conditionals = null;
    this.loaded = false;
    this.registeredSymbols = new Set();
  }

  /**
   * Load all S-52 data files (symbols, rules, colors, conditionals)
   */
  async loadAll() {
    if (this.loaded) {
      console.log('✅ S-52 data already loaded');
      return true;
    }

    try {
      console.log('📦 Loading S-52 data...');
      
      const [symbolsRes, rulesRes, colorsRes, conditionalsRes] = await Promise.all([
        fetch('/s52-parsed/symbols.json'),
        fetch('/s52-parsed/rules.json'),
        fetch('/s52-parsed/colors.json'),
        fetch('/s52-parsed/conditionals.json').catch(() => ({ ok: false }))
      ]);

      if (!symbolsRes.ok || !rulesRes.ok || !colorsRes.ok) {
        throw new Error('Failed to fetch S-52 data files');
      }

      this.symbols = await symbolsRes.json();
      this.rules = await rulesRes.json();
      this.colors = await colorsRes.json();
      
      if (conditionalsRes.ok) {
        this.conditionals = await conditionalsRes.json();
      } else {
        console.warn('⚠️  No conditionals.json found - using attribute-based fallbacks');
        this.conditionals = {};
      }
      
      this.loaded = true;

      console.log('✅ S-52 data loaded:', {
        symbols: Object.keys(this.symbols).length,
        rules: Object.keys(this.rules).length,
        colors: Object.keys(this.colors).length,
        conditionals: Object.keys(this.conditionals).length
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to load S-52 data:', error);
      return false;
    }
  }

  /**
   * Register symbols with MapLibre map
   * Extracts each symbol from the sprite sheet and adds as a map image
   */
  async registerSymbols(map) {
    if (!map) {
      console.error('❌ Map not provided');
      return 0;
    }

    if (!this.loaded) {
      await this.loadAll();
    }

    if (!this.symbols || Object.keys(this.symbols).length === 0) {
      console.warn('⚠️ No symbols loaded');
      return 0;
    }

    return new Promise((resolve, reject) => {
      const spritePath = '/s52-parsed/rastersymbols-day.png';
      
      map.loadImage(spritePath, (err, image) => {
        if (err) {
          console.error('❌ Failed to load sprite sheet:', err);
          reject(err);
          return;
        }

        console.log('📦 Sprite sheet loaded, registering symbols...');
        let registered = 0;
        let skipped = 0;

        for (const [name, symbolDef] of Object.entries(this.symbols)) {
          try {
            const { bounds } = symbolDef;

            // Validate bounds
            if (!bounds || bounds.width === 0 || bounds.height === 0) {
              skipped++;
              continue;
            }

            // Skip if already registered
            if (map.hasImage(name)) {
              skipped++;
              continue;
            }

            // Create canvas to extract symbol from sprite sheet
            const canvas = document.createElement('canvas');
            canvas.width = bounds.width;
            canvas.height = bounds.height;
            const ctx = canvas.getContext('2d');

            // Extract symbol region from sprite
            ctx.drawImage(
              image,
              bounds.x, bounds.y, bounds.width, bounds.height,  // Source
              0, 0, bounds.width, bounds.height                  // Destination
            );

            const imageData = ctx.getImageData(0, 0, bounds.width, bounds.height);

            // Add to map
            map.addImage(name, imageData, {
              pixelRatio: 1,
              sdf: false
            });

            this.registeredSymbols.add(name);
            registered++;

          } catch (error) {
            console.warn(`⚠️ Failed to register symbol ${name}:`, error.message);
          }
        }

        console.log(`✅ Registered ${registered} symbols (${skipped} skipped)`);
        resolve(registered);
      });
    });
  }

  /**
   * Get symbol definition by name
   */
  getSymbol(name) {
    return this.symbols?.[name] || null;
  }

  /**
   * Get display rule for an object class
   */
  getRule(objectClass) {
    return this.rules?.[objectClass] || null;
  }

  /**
   * Get color by name
   */
  getColor(colorName) {
    return this.colors?.[colorName] || null;
  }

  /**
   * Resolve symbol for a feature with conditional symbology
   * Applies S-52 conditional rules based on feature attributes
   */
  resolveSymbol(objectClass, attributes = {}) {
    const rule = this.getRule(objectClass);
    if (!rule) return null;

    // If there's a direct symbol, use it
    if (rule.symbol && !rule.conditional) {
      return rule.symbol;
    }

    // If conditional symbology exists, resolve it
    if (rule.conditional) {
      return this.resolveConditional(rule.conditional, attributes, objectClass);
    }

    return null;
  }

  /**
   * Resolve conditional symbology based on feature attributes
   * Implements S-52 conditional symbology procedures (CSP)
   */
  resolveConditional(cspName, attributes, objectClass) {
    // LIGHTS conditional
    if (cspName === 'LIGHTS05' || objectClass === 'LIGHTS') {
      return this.resolveLightSymbol(attributes);
    }

    // BUOYS conditional
    if (['BOYCAR', 'BOYINB', 'BOYISD', 'BOYLAT', 'BOYSAW', 'BOYSPP'].includes(objectClass)) {
      return this.resolveBuoySymbol(attributes);
    }

    // BEACONS conditional
    if (['BCNCAR', 'BCNISD', 'BCNLAT', 'BCNSAW', 'BCNSPP'].includes(objectClass)) {
      return this.resolveBeaconSymbol(attributes);
    }

    // OBSTRUCTIONS conditional
    if (cspName === 'OBSTRN04' || objectClass === 'OBSTRN' || objectClass === 'UWTROC') {
      return this.resolveObstructionSymbol(attributes);
    }

    // WRECKS conditional
    if (cspName === 'WRECKS02' || objectClass === 'WRECKS') {
      return this.resolveWreckSymbol(attributes);
    }

    // Fallback: try CSP table
    const csp = this.conditionals?.[cspName];
    if (csp && csp.instructions && csp.instructions.length > 0) {
      const firstInst = csp.instructions[0];
      const symbolMatch = firstInst.match(/SY\(([A-Z0-9]+)\)/);
      return symbolMatch ? symbolMatch[1] : null;
    }

    return null;
  }

  /**
   * Resolve light symbol based on S-57 attributes
   * CATLIT: Category of light
   * COLOUR: Light color (1=white, 3=red, 4=green, 6=yellow)
   * LITCHR: Light characteristic
   */
  resolveLightSymbol(attributes) {
    const catlit = parseInt(attributes.CATLIT) || 0;
    const colour = this.parseColourAttribute(attributes.COLOUR);
    const litchr = parseInt(attributes.LITCHR) || 0;
    
    // Sector light
    if (catlit === 8 || (attributes.SECTR1 && attributes.SECTR2)) {
      if (colour.includes(3)) return 'LIGHTS11'; // Red sector
      if (colour.includes(4)) return 'LIGHTS12'; // Green sector
      if (colour.includes(1)) return 'LIGHTS13'; // White sector
      return 'LIGHTS10'; // Generic sector
    }

    // Directional light
    if (catlit === 4) return 'LITDIR01';

    // Leading light
    if (catlit === 6) return 'LIGHTS70';

    // Aero light
    if (catlit === 7) return 'LIGHTS84';

    // Air obstruction light
    if (catlit === 13) return 'LIGHTS85';

    // Fog detector light
    if (catlit === 14) return 'FOGSIG01';

    // Color-based symbols for general lights
    if (colour.includes(3)) return 'LITRD01';  // Red
    if (colour.includes(4)) return 'LITGN01';  // Green
    if (colour.includes(6)) return 'LITYW01';  // Yellow
    if (colour.includes(1)) return 'LIGHTS82'; // White

    // Characteristic-based
    if (litchr === 1) return 'LIGHTS81'; // Fixed
    if (litchr === 2) return 'LIGHTS82'; // Flashing
    if (litchr === 4) return 'LIGHTS83'; // Quick flashing

    return 'LIGHTS82'; // Default
  }

  /**
   * Resolve buoy symbol based on S-57 attributes
   * BOYSHP: Buoy shape
   * COLOUR: Buoy color
   * CATPAM: Category of special purpose mark
   */
  resolveBuoySymbol(attributes) {
    const boyshp = parseInt(attributes.BOYSHP) || 0;
    const colour = this.parseColourAttribute(attributes.COLOUR);
    const catpam = parseInt(attributes.CATPAM) || 0;
    const catspm = parseInt(attributes.CATSPM) || 0;

    // Lateral buoys - port hand (red, can)
    if (boyshp === 2 && colour.includes(3)) return 'BOYCAN13';
    
    // Lateral buoys - starboard hand (green, cone)
    if (boyshp === 3 && colour.includes(4)) return 'BOYCON15';

    // Cardinal marks
    if (catpam === 9 || attributes.BCNSHP === 1) return 'BOYCAR02'; // North
    if (catpam === 10 || attributes.BCNSHP === 2) return 'BOYCAR03'; // East
    if (catpam === 11 || attributes.BCNSHP === 3) return 'BOYCAR04'; // South
    if (catpam === 12 || attributes.BCNSHP === 4) return 'BOYCAR05'; // West

    // Isolated danger
    if (catpam === 3 || attributes.CATNAM) return 'BOYISD12';

    // Safe water
    if (catpam === 4 || catspm === 4) return 'BOYSPP11';

    // Special mark
    if (catpam === 5 || catspm === 5) return 'BOYSUP02';

    // Shapes
    if (boyshp === 2) return 'BOYCAN11'; // Can
    if (boyshp === 3) return 'BOYCON11'; // Conical
    if (boyshp === 4) return 'BOYSPH12'; // Spherical
    if (boyshp === 5) return 'BOYPIL11'; // Pillar
    if (boyshp === 6) return 'BOYSPR11'; // Spar
    if (boyshp === 7) return 'BOYBAR11'; // Barrel
    if (boyshp === 8) return 'BOYSUP11'; // Super buoy

    // Mooring buoy
    if (attributes.CATMOR) return 'BOYMOR11';

    return 'BOYDEF03'; // Default
  }

  /**
   * Resolve beacon symbol based on S-57 attributes
   */
  resolveBeaconSymbol(attributes) {
    const bcnshp = parseInt(attributes.BCNSHP) || 0;
    const colour = this.parseColourAttribute(attributes.COLOUR);
    const catspm = parseInt(attributes.CATSPM) || 0;

    // Lateral beacons
    if (bcnshp === 3 && colour.includes(3)) return 'BCNSTK02'; // Port
    if (bcnshp === 3 && colour.includes(4)) return 'BCNSTK03'; // Starboard

    // Cardinal beacons
    if (bcnshp === 1) return 'BCNCAR02'; // North
    if (bcnshp === 2) return 'BCNCAR03'; // East
    if (bcnshp === 4) return 'BCNCAR04'; // South
    if (bcnshp === 5) return 'BCNCAR05'; // West

    // Isolated danger
    if (attributes.CATNAM) return 'BCNISD21';

    // Safe water
    if (catspm === 4) return 'BCNSPP21';

    // Special purpose
    if (catspm === 5) return 'BCNSUP02';

    return 'BCNDEF13'; // Default
  }

  /**
   * Resolve obstruction symbol based on depth and water level
   */
  resolveObstructionSymbol(attributes) {
    const valsou = parseFloat(attributes.VALSOU);
    const watlev = parseInt(attributes.WATLEV) || 0;

    // Dangerous depth
    if (!isNaN(valsou) && valsou < 20) return 'OBSTRN04';

    // Water level effects
    if (watlev === 3) return 'OBSTRN11'; // Always under water
    if (watlev === 4) return 'OBSTRN03'; // Covers and uncovers
    if (watlev === 5) return 'OBSTRN01'; // Awash

    return 'OBSTRN04'; // Default
  }

  /**
   * Resolve wreck symbol based on depth and category
   */
  resolveWreckSymbol(attributes) {
    const valsou = parseFloat(attributes.VALSOU);
    const catwrk = parseInt(attributes.CATWRK) || 0;

    // Dangerous wreck (shallow)
    if (!isNaN(valsou) && valsou < 20) return 'WRECKS04';

    // Non-dangerous wreck (deep)
    if (!isNaN(valsou) && valsou >= 20) return 'WRECKS05';

    // Category-based
    if (catwrk === 1) return 'WRECKS01'; // Mast/funnel visible
    if (catwrk === 2) return 'WRECKS04'; // Any portion visible
    if (catwrk === 4) return 'WRECKS04'; // Dangerous to surface
    if (catwrk === 5) return 'WRECKS05'; // Not dangerous

    return 'WRECKS01'; // Default
  }

  /**
   * Parse COLOUR attribute (can be single value or comma-separated list)
   */
  parseColourAttribute(colour) {
    if (!colour) return [];
    
    // Handle string or number
    const colourStr = String(colour);
    
    // Split by comma if multiple values
    return colourStr.split(',').map(c => parseInt(c.trim())).filter(c => !isNaN(c));
  }

  /**
   * Get symbol name from display rule instruction
   */
  getSymbolFromInstruction(instruction) {
    const match = instruction?.match(/SY\(([A-Z0-9]+)\)/);
    return match ? match[1] : null;
  }

  /**
   * Check if a symbol is registered
   */
  isSymbolRegistered(name) {
    return this.registeredSymbols.has(name);
  }
}

// Export singleton instance
export const s52Loader = new S52Loader();