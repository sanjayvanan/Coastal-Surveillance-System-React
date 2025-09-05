const API_BASE_URL = '/api';

class ShapefileAPI {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async get(endpoint) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`API GET error for ${endpoint}:`, error);
      throw error;
    }
  }

  async post(endpoint, data = null) {
    try {
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      };
      
      if (data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`API POST error for ${endpoint}:`, error);
      throw error;
    }
  }

  async getBounds() {
    return this.get('/bounds');
  }

  async getLayers() {
    return this.get('/layers');
  }

  async getTileData(centerX, centerY, zoom, width, height) {
    const params = new URLSearchParams({
      centerX: centerX.toString(),
      centerY: centerY.toString(), 
      zoom: zoom.toString(),
      width: width.toString(),
      height: height.toString()
    });
    return this.get(`/tiles?${params}`);
  }

  async getVectorTileMetadata() {
    return this.get('/vector-tiles/metadata');
  }

  async getVectorTile(z, x, y) {
    try {
      const response = await fetch(`${this.baseUrl}/vector-tiles/${z}/${x}/${y}.mvt`);
      if (!response.ok) {
        throw new Error(`Vector tile not found: ${z}/${x}/${y}`);
      }
      return await response.arrayBuffer();
    } catch (error) {
      console.error(`Vector tile error for ${z}/${x}/${y}:`, error);
      throw error;
    }
  }

  async toggleLayer(layerName) {
    return this.post(`/layer/${layerName}/toggle`);
  }

  async regenerateVectorTiles() {
    return this.post('/vector-tiles/regenerate');
  }
}

export default new ShapefileAPI();
