// src/config/autoEncLayers.js
// Auto-generates MapLibre layers from S-52 rules with conditional symbology support

/**
 * S-57 tables that have ONLY ONE geometry type (no suffix in T-Rex)
 */
const SINGLE_GEOMETRY_TABLES = {
  // Points only
  boylat: 'point',
  boysaw: 'point',
  boyspp: 'point',
  boycar: 'point',
  boyisd: 'point',
  bcnlat: 'point',
  bcnspp: 'point',
  bcncar: 'point',
  bcnisd: 'point',
  lights: 'point',
  uwtroc: 'point',
  soundg: 'point',
  fogsig: 'point',
  rdosta: 'point',
  topmar: 'point',
  daymar: 'point',
  
  // Polygons only
  tsslpt: 'polygon',
  resare: 'polygon',
};

/**
 * Fetches and parses S-52 rules and color definitions to generate MapLibre layers.
 */
export async function getAutoEncLayers() {
  try {
    const [rulesResponse, colorsResponse] = await Promise.all([
      fetch('/s52-parsed/rules.json'),
      fetch('/s52-parsed/colors.json')
    ]);

    if (!rulesResponse.ok || !colorsResponse.ok) {
      throw new Error('Failed to fetch S-52 JSON files.');
    }

    const rules = await rulesResponse.json();
    const colors = await colorsResponse.json();
    const layers = [];

    // --- Manually add LNDARE and DEPARE for correct styling ---
    
    // Land Area
    layers.push({
      id: 'enc-lndare-fill-manual',
      type: 'fill',
      source: 'enc-tiles',
      'source-layer': 'lndare_polygons',
      paint: {
        'fill-color': '#D9C29E', // LANDA
        'fill-opacity': 1,
      },
    });

    // Depth Area with graduated colors
    layers.push({
      id: 'enc-depare-fill-manual',
      type: 'fill',
      source: 'enc-tiles',
      'source-layer': 'depare_polygons',
      paint: {
        'fill-color': [
          'interpolate', ['linear'], ['get', 'drval1'],
          0, '#C6E2FF',   // DEPVS - Very Shallow
          5, '#AAD3FF',   // DEPMD - Medium  
          10, '#94BFFF',  // DEPCN - Intermediate
          20, '#8DB4E2',  // DEPMS - Deep
          50, '#7DA5D9'   // DEPDW - Very Deep
        ],
        'fill-opacity': 0.7,
      },
    });
    
    // --- Create color lookup map ---
    const colorMap = Object.entries(colors).reduce((acc, [key, value]) => {
      acc[key] = value.hex;
      return acc;
    }, {});
    const getColorFromRef = (ref) => colorMap[ref] || '#FF00FF';

    // --- Auto-generate layers from rules.json ---
    for (const [objectClass, rule] of Object.entries(rules)) {
      // Skip manual layers
      if (objectClass === 'LNDARE' || objectClass === 'DEPARE') {
        continue;
      }
      
      const baseLayerName = objectClass.toLowerCase();
      const layerPrefix = `enc-auto-${baseLayerName}`;
      const minZoom = rule.minZoom || 8;
      const instruction = rule.instruction || '';

      // Check for conditional symbology (CS)
      const conditionalMatch = instruction.match(/CS\(([^)]+)\)/);
      if (conditionalMatch) {
        const conditionalName = conditionalMatch[1];
        
        // ============================================================================
        // LIGHTS CONDITIONAL SYMBOLOGY (CS(LIGHTS05))
        // ============================================================================
        if (conditionalName === 'LIGHTS05') {
          // Main light symbol based on CATLIT (category of light)
          layers.push({
            id: 'enc-auto-lights-main',
            type: 'symbol',
            source: 'enc-tiles',
            'source-layer': 'lights',
            minzoom: 10,
            layout: {
              'icon-image': [
                'case',
                // Sector light (CATLIT = 8)
                ['==', ['get', 'CATLIT'], 8], 'LIGHTS10',
                // Directional function (CATLIT = 4)
                ['==', ['get', 'CATLIT'], 4], 'LITDIR01',
                // Leading light (CATLIT = 6)
                ['==', ['get', 'CATLIT'], 6], 'LIGHTS70',
                // Aero light (CATLIT = 7)
                ['==', ['get', 'CATLIT'], 7], 'LIGHTS84',
                // Air obstruction light (CATLIT = 13)
                ['==', ['get', 'CATLIT'], 13], 'LIGHTS85',
                // Fog detector light (CATLIT = 14)
                ['==', ['get', 'CATLIT'], 14], 'FOGSIG01',
                // Default: Major light
                'LIGHTS82'
              ],
              'icon-size': 1.0,
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
            },
          });

          // Colored flare layer based on COLOUR attribute
          layers.push({
            id: 'enc-auto-lights-flare',
            type: 'symbol',
            source: 'enc-tiles',
            'source-layer': 'lights',
            minzoom: 10,
            filter: ['has', 'COLOUR'],
            layout: {
              'icon-image': [
                'case',
                // Red (COLOUR = 3)
                ['any',
                  ['==', ['get', 'COLOUR'], 3],
                  ['==', ['to-string', ['get', 'COLOUR']], '3'],
                  ['in', '3', ['to-string', ['get', 'COLOUR']]]
                ], 'LIGHTS11',
                
                // Green (COLOUR = 4)
                ['any',
                  ['==', ['get', 'COLOUR'], 4],
                  ['==', ['to-string', ['get', 'COLOUR']], '4'],
                  ['in', '4', ['to-string', ['get', 'COLOUR']]]
                ], 'LIGHTS12',
                
                // White/Yellow (COLOUR = 1, 6)
                ['any',
                  ['==', ['get', 'COLOUR'], 1],
                  ['==', ['get', 'COLOUR'], 6],
                  ['==', ['to-string', ['get', 'COLOUR']], '1'],
                  ['==', ['to-string', ['get', 'COLOUR']], '6']
                ], 'LIGHTS13',
                
                // Default white
                'LIGHTS13'
              ],
              'icon-size': 1.0,
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
            },
            paint: {
              'icon-opacity': 0.9,
            },
          });
          
          console.log('✅ Generated LIGHTS05 conditional symbology');
          continue;
        }
        
        // ============================================================================
        // BUOY CONDITIONAL SYMBOLOGY
        // ============================================================================
        if (['BOYCAR', 'BOYINB', 'BOYISD', 'BOYLAT', 'BOYSAW', 'BOYSPP'].includes(objectClass)) {
          const layerName = baseLayerName;
          
          layers.push({
            id: `enc-auto-${layerName}-symbol`,
            type: 'symbol',
            source: 'enc-tiles',
            'source-layer': layerName,
            minzoom: 10,
            layout: {
              'icon-image': [
                'case',
                
                // === LATERAL BUOYS (BOYLAT) ===
                // Port hand (red, can/cylinder)
                ['all',
                  ['==', ['get', 'BOYSHP'], 2], // Can
                  ['any',
                    ['in', '3', ['to-string', ['get', 'COLOUR']]],
                    ['==', ['get', 'COLOUR'], 3]
                  ]
                ], 'BOYCAN13',
                
                // Starboard hand (green, cone)
                ['all',
                  ['==', ['get', 'BOYSHP'], 3], // Conical
                  ['any',
                    ['in', '4', ['to-string', ['get', 'COLOUR']]],
                    ['==', ['get', 'COLOUR'], 4]
                  ]
                ], 'BOYCON15',
                
                // === CARDINAL MARKS (BOYCAR) ===
                // North cardinal
                ['==', ['get', 'BCNSHP'], 1], 'BOYCAR02',
                // East cardinal
                ['==', ['get', 'BCNSHP'], 2], 'BOYCAR03',
                // South cardinal
                ['==', ['get', 'BCNSHP'], 3], 'BOYCAR04',
                // West cardinal
                ['==', ['get', 'BCNSHP'], 4], 'BOYCAR05',
                
                // === ISOLATED DANGER (BOYISD) ===
                ['has', 'CATNAM'], 'BOYISD12',
                
                // === SAFE WATER (BOYSPP) ===
                ['==', ['get', 'CATSPM'], 4], 'BOYSPP11',
                
                // === SPECIAL PURPOSE (BOYSAW) ===
                ['==', ['get', 'CATSPM'], 5], 'BOYSUP02',
                
                // === SHAPES ===
                // Can buoys (cylinder)
                ['==', ['get', 'BOYSHP'], 2], 'BOYCAN11',
                // Conical buoys
                ['==', ['get', 'BOYSHP'], 3], 'BOYCON11',
                // Spherical buoys
                ['==', ['get', 'BOYSHP'], 4], 'BOYSPH12',
                // Pillar buoys
                ['==', ['get', 'BOYSHP'], 5], 'BOYPIL11',
                // Spar buoys
                ['==', ['get', 'BOYSHP'], 6], 'BOYSPR11',
                // Barrel buoys
                ['==', ['get', 'BOYSHP'], 7], 'BOYBAR11',
                // Super buoy
                ['==', ['get', 'BOYSHP'], 8], 'BOYSUP11',
                
                // === MOORING BUOYS ===
                ['has', 'CATMOR'], 'BOYMOR11',
                
                // === DEFAULT ===
                'BOYDEF03'
              ],
              'icon-size': 1.0,
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
            },
          });
          
          console.log(`✅ Generated ${objectClass} conditional symbology`);
          continue;
        }
        
        // ============================================================================
        // BEACON CONDITIONAL SYMBOLOGY
        // ============================================================================
        if (['BCNCAR', 'BCNISD', 'BCNLAT', 'BCNSAW', 'BCNSPP'].includes(objectClass)) {
          const layerName = baseLayerName;
          
          layers.push({
            id: `enc-auto-${layerName}-symbol`,
            type: 'symbol',
            source: 'enc-tiles',
            'source-layer': layerName,
            minzoom: 10,
            layout: {
              'icon-image': [
                'case',
                
                // === LATERAL BEACONS ===
                // Port hand (red)
                ['all',
                  ['==', ['get', 'BCNSHP'], 3], // Stake/pole
                  ['any',
                    ['in', '3', ['to-string', ['get', 'COLOUR']]],
                    ['==', ['get', 'COLOUR'], 3]
                  ]
                ], 'BCNSTK02',
                
                // Starboard hand (green)
                ['all',
                  ['==', ['get', 'BCNSHP'], 3],
                  ['any',
                    ['in', '4', ['to-string', ['get', 'COLOUR']]],
                    ['==', ['get', 'COLOUR'], 4]
                  ]
                ], 'BCNSTK03',
                
                // === CARDINAL BEACONS ===
                ['==', ['get', 'BCNSHP'], 1], 'BCNCAR02', // North
                ['==', ['get', 'BCNSHP'], 2], 'BCNCAR03', // East
                ['==', ['get', 'BCNSHP'], 4], 'BCNCAR04', // South
                ['==', ['get', 'BCNSHP'], 5], 'BCNCAR05', // West
                
                // === ISOLATED DANGER ===
                ['has', 'CATNAM'], 'BCNISD21',
                
                // === SAFE WATER ===
                ['==', ['get', 'CATSPM'], 4], 'BCNSPP21',
                
                // === SPECIAL PURPOSE ===
                ['==', ['get', 'CATSPM'], 5], 'BCNSUP02',
                
                // === DEFAULT ===
                'BCNDEF13'
              ],
              'icon-size': 1.0,
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
            },
          });
          
          console.log(`✅ Generated ${objectClass} conditional symbology`);
          continue;
        }
        
        // ============================================================================
        // OBSTRUCTION CONDITIONAL SYMBOLOGY (CS(OBSTRN04))
        // ============================================================================
        if (conditionalName === 'OBSTRN04' || objectClass === 'OBSTRN' || objectClass === 'UWTROC') {
          layers.push({
            id: `enc-auto-${baseLayerName}-symbol`,
            type: 'symbol',
            source: 'enc-tiles',
            'source-layer': baseLayerName,
            minzoom: 10,
            layout: {
              'icon-image': [
                'case',
                // Check if depth is dangerous (VALSOU < safety depth, typically 20m)
                ['<', ['get', 'VALSOU'], 20], 'OBSTRN04', // Dangerous
                // Check water level effect
                ['==', ['get', 'WATLEV'], 3], 'OBSTRN11', // Always under water
                ['==', ['get', 'WATLEV'], 4], 'OBSTRN03', // Covers and uncovers
                ['==', ['get', 'WATLEV'], 5], 'OBSTRN01', // Awash
                // Default obstruction
                'OBSTRN04'
              ],
              'icon-size': 1.0,
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
            },
          });
          
          console.log(`✅ Generated ${objectClass} conditional symbology`);
          continue;
        }
        
        // ============================================================================
        // WRECK CONDITIONAL SYMBOLOGY (CS(WRECKS02))
        // ============================================================================
        if (conditionalName === 'WRECKS02' || objectClass === 'WRECKS') {
          layers.push({
            id: `enc-auto-${baseLayerName}-symbol`,
            type: 'symbol',
            source: 'enc-tiles',
            'source-layer': baseLayerName,
            minzoom: 10,
            layout: {
              'icon-image': [
                'case',
                // Dangerous wreck (shallow depth)
                ['all',
                  ['has', 'VALSOU'],
                  ['<', ['get', 'VALSOU'], 20]
                ], 'WRECKS04',
                // Non-dangerous wreck (deep)
                ['all',
                  ['has', 'VALSOU'],
                  ['>=', ['get', 'VALSOU'], 20]
                ], 'WRECKS05',
                // Wreck showing mast/funnel
                ['==', ['get', 'CATWRK'], 1], 'WRECKS01',
                // Wreck showing any portion
                ['==', ['get', 'CATWRK'], 2], 'WRECKS04',
                // Wreck dangerous only to surface navigation
                ['==', ['get', 'CATWRK'], 4], 'WRECKS04',
                // Wreck not dangerous to surface navigation
                ['==', ['get', 'CATWRK'], 5], 'WRECKS05',
                // Default wreck
                'WRECKS01'
              ],
              'icon-size': 1.0,
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
            },
          });
          
          console.log(`✅ Generated ${objectClass} conditional symbology`);
          continue;
        }
        
        // ============================================================================
        // SOUNDING CONDITIONAL SYMBOLOGY (CS(SOUNDG02))
        // ============================================================================
        if (conditionalName === 'SOUNDG02' || objectClass === 'SOUNDG') {
          layers.push({
            id: `enc-auto-${baseLayerName}-text`,
            type: 'symbol',
            source: 'enc-tiles',
            'source-layer': baseLayerName,
            minzoom: 12,
            layout: {
              'text-field': ['to-string', ['get', 'DEPTH']],
              'text-font': ['Open Sans Regular'],
              'text-size': 10,
              'text-allow-overlap': false,
              'text-ignore-placement': false,
            },
            paint: {
              'text-color': [
                'case',
                ['<', ['get', 'DEPTH'], 10], '#204A87', // SNDG2 - shallow
                '#729FCF' // SNDG1 - deeper
              ],
              'text-halo-color': '#FFFFFF',
              'text-halo-width': 1.5,
            },
          });
          
          console.log(`✅ Generated ${objectClass} conditional symbology`);
          continue;
        }
        
        // For other conditionals, log warning
        console.warn(`⚠️  ${objectClass} uses CS(${conditionalName}) - using fallback rendering`);
      }

      // ============================================================================
      // STANDARD RENDERING (Non-conditional)
      // ============================================================================
      
      const symbolMatch = instruction.match(/SY\(([^,)]+)/);
      const symbolName = symbolMatch ? symbolMatch[1].trim() : null;

      const areaMatch = instruction.match(/AP\(([^)]+)\)/);
      const areaPattern = areaMatch ? areaMatch[1] : null;

      const lineMatch = instruction.match(/LS\(([^,]+),[^,]+,([^)]+)\)/);
      const lineStyle = lineMatch ? { style: lineMatch[1], color: lineMatch[2] } : null;

      // Determine source-layer names
      const isSingleGeometry = baseLayerName in SINGLE_GEOMETRY_TABLES;
      
      let sourceLayerPoints, sourceLayerPolygons, sourceLayerLines;
      
      if (isSingleGeometry) {
        sourceLayerPoints = baseLayerName;
        sourceLayerPolygons = baseLayerName;
        sourceLayerLines = baseLayerName;
      } else {
        sourceLayerPoints = baseLayerName;
        sourceLayerPolygons = `${baseLayerName}_polygons`;
        sourceLayerLines = `${baseLayerName}_lines`;
      }

      // === POINT SYMBOLS ===
      if (symbolName) {
        layers.push({
          id: `${layerPrefix}-symbol`,
          type: 'symbol',
          source: 'enc-tiles',
          'source-layer': sourceLayerPoints,
          minzoom: minZoom,
          layout: { 
            'icon-image': symbolName, 
            'icon-size': 1, 
            'icon-allow-overlap': true, 
            'icon-ignore-placement': true 
          },
          paint: rule.colors?.textColor ? {
            'icon-opacity': 1
          } : {},
        });
      }

      // === AREA FILLS ===
      if (areaPattern) {
        layers.push({
          id: `${layerPrefix}-fill`,
          type: 'fill',
          source: 'enc-tiles',
          'source-layer': sourceLayerPolygons,
          minzoom: minZoom,
          paint: { 
            'fill-color': getColorFromRef(areaPattern), 
            'fill-opacity': 0.5 
          },
        });
      }

      // === LINE STYLES ===
      if (lineStyle) {
        layers.push({
          id: `${layerPrefix}-line`,
          type: 'line',
          source: 'enc-tiles',
          'source-layer': sourceLayerLines,
          minzoom: minZoom,
          paint: {
            'line-color': getColorFromRef(lineStyle.color),
            'line-width': lineStyle.style === 'DASH' ? 2 : 1.5,
            'line-dasharray': lineStyle.style === 'DASH' ? [2, 2] : [1],
          },
        });
      }
    }

    console.log(`✅ Auto-generated ${layers.length} layers from S-52 rules`);
    return layers;
    
  } catch (error) {
    console.error('❌ Failed to auto-generate S-52 layers:', error);
    return [];
  }
}

/**
 * Fallback static layers (empty - all layers are auto-generated)
 */
export function getStaticEncLayers() {
  return [];
}

/**
 * Main export - delegates to auto-generator
 */
export async function getSmartEncLayers() {
  return getAutoEncLayers();
}