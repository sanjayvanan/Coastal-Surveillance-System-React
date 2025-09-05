import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';

export class VectorTileUtils {
  static parseVectorTile(arrayBuffer) {
    try {
      // For compressed tiles (like those from the backend)
      let buffer;
      try {
        // Try to decompress if it's compressed
        buffer = this.decompressData(arrayBuffer);
      } catch (e) {
        // If decompression fails, use as is
        buffer = arrayBuffer;
      }
      
      const tile = new VectorTile(new Protobuf(buffer));
      return tile;
    } catch (error) {
      console.error('Error parsing vector tile:', error);
      return null;
    }
  }

  static decompressData(compressedData) {
    // Simple decompression for the Qt compressed format
    // The backend uses qCompress, which is roughly compatible with zlib
    const uint8Array = new Uint8Array(compressedData);
    
    // For now, we'll handle this as JSON since the backend encodes as JSON then compresses
    try {
      // Try to parse as JSON first (in case it's the JSON format from backend)
      const text = new TextDecoder().decode(uint8Array);
      const jsonData = JSON.parse(text);
      return this.convertJSONToMVT(jsonData);
    } catch (e) {
      // If not JSON, return original buffer
      return compressedData;
    }
  }

  static convertJSONToMVT(jsonTile) {
    // Convert the JSON format from backend to a format we can work with
    // This handles the custom JSON format the backend sends
    const mockTile = {
      layers: {}
    };

    if (jsonTile.layers) {
      jsonTile.layers.forEach(layer => {
        mockTile.layers[layer.name] = {
          name: layer.name,
          extent: layer.extent || 4096,
          length: layer.geometries ? layer.geometries.length : 0,
          _features: layer.geometries || [],
          
          feature(i) {
            const geom = this._features[i];
            if (!geom) return null;
            
            return {
              id: i,
              type: geom.type,
              properties: geom.properties || {},
              loadGeometry() {
                return geom.coordinates.map(ring => 
                  ring.map(coord => ({ x: coord[0], y: coord[1] }))
                );
              }
            };
          }
        };
      });
    }

    return mockTile;
  }

  static getTilesForBounds(bounds, zoom) {
    const tiles = [];
    
    // Calculate tile range for the given bounds and zoom
    const minTileX = Math.floor(this.lonToTileX(bounds.minX, zoom));
    const maxTileX = Math.floor(this.lonToTileX(bounds.maxX, zoom));
    const minTileY = Math.floor(this.latToTileY(bounds.maxY, zoom));
    const maxTileY = Math.floor(this.latToTileY(bounds.minY, zoom));

    for (let x = minTileX; x <= maxTileX; x++) {
      for (let y = minTileY; y <= maxTileY; y++) {
        tiles.push({ z: zoom, x, y });
      }
    }

    return tiles;
  }

  static lonToTileX(lon, zoom) {
    return ((lon + 180) / 360) * Math.pow(2, zoom);
  }

  static latToTileY(lat, zoom) {
    return (1 - Math.log(Math.tan(lat * Math.PI / 180) + 
           1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom);
  }

  static tileXToLon(x, zoom) {
    return (x / Math.pow(2, zoom)) * 360 - 180;
  }

  static tileYToLat(y, zoom) {
    const n = Math.PI - 2 * Math.PI * y / Math.pow(2, zoom);
    return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  }
}

export default VectorTileUtils;
