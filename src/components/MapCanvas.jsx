import React, { useRef, useEffect, useCallback, useState } from 'react';
import API from '../api.js';
import VectorTileUtils from '../utils/vectorTileUtils.js';

const MapCanvas = ({ 
  bounds, 
  layers, 
  selectedLayers, 
  onLayerToggle,
  vectorTilesAvailable 
}) => {
  const canvasRef = useRef(null);
  const [viewport, setViewport] = useState({
    centerX: 0.5,
    centerY: 0.5, 
    zoom: 1.0
  });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [mapData, setMapData] = useState(null);
  const [vectorTiles, setVectorTiles] = useState(new Map());
  const animationFrameRef = useRef(null);

  // Canvas dimensions
  const canvasWidth = 1000;
  const canvasHeight = 600;

  // World to screen coordinate conversion
  const worldToScreen = useCallback((worldX, worldY) => {
    if (!bounds) return { x: 0, y: 0 };
    
    const worldWidth = bounds.maxX - bounds.minX;
    const worldHeight = bounds.maxY - bounds.minY;
    
    // Convert world coords to normalized coords (0-1)
    const normalizedX = (worldX - bounds.minX) / worldWidth;
    const normalizedY = (worldY - bounds.minY) / worldHeight;
    
    // Apply viewport transform
    const viewportWidth = canvasWidth / viewport.zoom;
    const viewportHeight = canvasHeight / viewport.zoom;
    
    const offsetX = (viewport.centerX * canvasWidth) - (viewportWidth / 2);
    const offsetY = (viewport.centerY * canvasHeight) - (viewportHeight / 2);
    
    const screenX = (normalizedX * canvasWidth - offsetX) * viewport.zoom;
    const screenY = canvasHeight - ((normalizedY * canvasHeight - offsetY) * viewport.zoom);
    
    return { x: screenX, y: screenY };
  }, [bounds, viewport, canvasWidth, canvasHeight]);

  // Load map data based on current viewport
  const loadMapData = useCallback(async () => {
    if (!bounds) return;
    
    try {
      // Try vector tiles first if available
      if (vectorTilesAvailable) {
        await loadVectorTiles();
        return;
      }
      
      // Fallback to GeoJSON
      const data = await API.getTileData(
        viewport.centerX,
        viewport.centerY,
        viewport.zoom,
        canvasWidth,
        canvasHeight
      );
      
      setMapData(data);
    } catch (error) {
      console.error('Error loading map data:', error);
      // Fallback to GeoJSON on error
      try {
        const data = await API.getTileData(
          viewport.centerX,
          viewport.centerY,
          viewport.zoom,
          canvasWidth,
          canvasHeight
        );
        setMapData(data);
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    }
  }, [bounds, viewport, vectorTilesAvailable, canvasWidth, canvasHeight]);

  // Load vector tiles for current viewport
  const loadVectorTiles = useCallback(async () => {
    if (!bounds) return;
    
    try {
      // Calculate which tiles we need for current viewport
      const zoom = Math.max(5, Math.min(8, Math.floor(viewport.zoom * 6))); // Backend has zoom 5-8
      const tiles = VectorTileUtils.getTilesForBounds(bounds, zoom);
      
      // Load tiles that we don't already have
      const tilePromises = tiles.slice(0, 20).map(async (tileCoord) => { // Limit to 20 tiles for performance
        const tileKey = `${tileCoord.z}_${tileCoord.x}_${tileCoord.y}`;
        
        if (!vectorTiles.has(tileKey)) {
          try {
            const tileData = await API.getVectorTile(tileCoord.z, tileCoord.x, tileCoord.y);
            const parsedTile = VectorTileUtils.parseVectorTile(tileData);
            
            if (parsedTile) {
              setVectorTiles(prev => new Map(prev.set(tileKey, {
                ...tileCoord,
                tile: parsedTile
              })));
            }
          } catch (error) {
            console.warn(`Failed to load tile ${tileKey}:`, error);
          }
        }
      });
      
      await Promise.allSettled(tilePromises);
    } catch (error) {
      console.error('Error loading vector tiles:', error);
    }
  }, [bounds, viewport, vectorTiles]);

  // Render polygons to canvas
  const renderPolygons = useCallback((ctx, polygons, style = {}) => {
    if (!polygons || !Array.isArray(polygons)) return;
    
    ctx.fillStyle = style.fillColor || 'rgba(100, 149, 237, 0.3)';
    ctx.strokeStyle = style.strokeColor || 'rgba(70, 130, 180, 0.8)';
    ctx.lineWidth = style.lineWidth || 1;
    
    polygons.forEach(polygon => {
      if (!polygon || !Array.isArray(polygon) || polygon.length < 3) return;
      
      ctx.beginPath();
      
      polygon.forEach((point, index) => {
        const screenPos = worldToScreen(point.x, point.y);
        
        if (index === 0) {
          ctx.moveTo(screenPos.x, screenPos.y);
        } else {
          ctx.lineTo(screenPos.x, screenPos.y);
        }
      });
      
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
  }, [worldToScreen]);

  // Render points to canvas
  const renderPoints = useCallback((ctx, points, style = {}) => {
    if (!points || !Array.isArray(points)) return;
    
    ctx.fillStyle = style.fillColor || 'rgba(255, 99, 71, 0.8)';
    const radius = style.radius || 3;
    
    points.forEach(point => {
      const screenPos = worldToScreen(point.x, point.y);
      
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, radius, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, [worldToScreen]);

  // Render vector tile data
  const renderVectorTile = useCallback((ctx, tileData) => {
    const { tile } = tileData;
    
    if (!tile || !tile.layers) return;
    
    Object.keys(tile.layers).forEach(layerName => {
      const layer = tile.layers[layerName];
      
      // Skip if layer is not selected
      if (!selectedLayers.includes(layerName) && 
          layerName !== 'base' && 
          layerName !== 'lndare') return;
      
      // Get layer style
      const layerInfo = layers.find(l => l.name === layerName);
      const style = {
        fillColor: layerInfo?.color ? 
          `rgba(${layerInfo.color.r}, ${layerInfo.color.g}, ${layerInfo.color.b}, 0.3)` :
          'rgba(100, 149, 237, 0.3)',
        strokeColor: layerInfo?.color ?
          `rgba(${layerInfo.color.r}, ${layerInfo.color.g}, ${layerInfo.color.b}, 0.8)` :
          'rgba(70, 130, 180, 0.8)'
      };
      
      // Render features in layer
      for (let i = 0; i < layer.length; i++) {
        const feature = layer.feature(i);
        if (!feature) continue;
        
        const geometry = feature.loadGeometry();
        
        if (feature.type === 1) { // Point
          // Convert MVT coordinates to world coordinates
          const points = geometry.map(ring => ring.map(coord => ({
            x: bounds.minX + (coord.x / 4096) * (bounds.maxX - bounds.minX),
            y: bounds.minY + (coord.y / 4096) * (bounds.maxY - bounds.minY)
          }))).flat();
          renderPoints(ctx, points, style);
          
        } else if (feature.type === 3) { // Polygon
          // Convert MVT coordinates to world coordinates
          const polygons = geometry.map(ring => ring.map(coord => ({
            x: bounds.minX + (coord.x / 4096) * (bounds.maxX - bounds.minX),
            y: bounds.minY + (coord.y / 4096) * (bounds.maxY - bounds.minY)
          })));
          renderPolygons(ctx, polygons, style);
        }
      }
    });
  }, [bounds, selectedLayers, layers, renderPolygons, renderPoints]);

  // Main render function
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bounds) return;
    
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.fillStyle = '#f0f8ff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Render vector tiles if available
    if (vectorTiles.size > 0) {
      vectorTiles.forEach(tileData => {
        renderVectorTile(ctx, tileData);
      });
    }
    // Fallback to GeoJSON rendering
    else if (mapData) {
      // Render base polygons
      if (mapData.basePolygons) {
        renderPolygons(ctx, mapData.basePolygons, {
          fillColor: 'rgba(139, 69, 19, 0.3)',
          strokeColor: 'rgba(139, 69, 19, 0.8)'
        });
      }
      
      // Render LNDARE polygons
      if (mapData.lndarePolygons) {
        renderPolygons(ctx, mapData.lndarePolygons, {
          fillColor: 'rgba(34, 139, 34, 0.3)',
          strokeColor: 'rgba(34, 139, 34, 0.8)'
        });
      }
      
      // Render layer data
      if (mapData.layers) {
        Object.keys(mapData.layers).forEach(layerName => {
          if (!selectedLayers.includes(layerName)) return;
          
          const layerData = mapData.layers[layerName];
          const layerInfo = layers.find(l => l.name === layerName);
          
          const style = {
            fillColor: layerInfo?.color ? 
              `rgba(${layerInfo.color.r}, ${layerInfo.color.g}, ${layerInfo.color.b}, 0.3)` :
              'rgba(255, 99, 71, 0.3)',
            strokeColor: layerInfo?.color ?
              `rgba(${layerInfo.color.r}, ${layerInfo.color.g}, ${layerInfo.color.b}, 0.8)` :
              'rgba(255, 99, 71, 0.8)'
          };
          
          if (layerData.polygons) {
            renderPolygons(ctx, layerData.polygons, style);
          }
          
          if (layerData.points) {
            renderPoints(ctx, layerData.points, style);
          }
        });
      }
    }
    
    // Render viewport info
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 200, 60);
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.fillText(`Center: ${viewport.centerX.toFixed(3)}, ${viewport.centerY.toFixed(3)}`, 15, 25);
    ctx.fillText(`Zoom: ${viewport.zoom.toFixed(2)}`, 15, 40);
    ctx.fillText(`Tiles: ${vectorTiles.size} loaded`, 15, 55);
    
  }, [bounds, viewport, mapData, vectorTiles, selectedLayers, layers, renderPolygons, renderPoints, renderVectorTile, canvasWidth, canvasHeight]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e) => {
    setIsDragging(true);
    const rect = canvasRef.current.getBoundingClientRect();
    setLastMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const currentMousePos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    const deltaX = currentMousePos.x - lastMousePos.x;
    const deltaY = currentMousePos.y - lastMousePos.y;
    
    setViewport(prev => ({
      ...prev,
      centerX: Math.max(0, Math.min(1, prev.centerX - deltaX / (canvasWidth * prev.zoom))),
      centerY: Math.max(0, Math.min(1, prev.centerY + deltaY / (canvasHeight * prev.zoom)))
    }));
    
    setLastMousePos(currentMousePos);
  }, [isDragging, lastMousePos, canvasWidth, canvasHeight]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

const handleWheel = useCallback((e) => {
  const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
  setViewport(prev => ({
    ...prev,
    zoom: Math.max(0.1, Math.min(10, prev.zoom * zoomFactor))
  }));
}, []);

// Add this new useEffect for proper wheel event handling
useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const handleWheelEvent = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setViewport(prev => ({
      ...prev,
      zoom: Math.max(0.1, Math.min(10, prev.zoom * zoomFactor))
    }));
  };

  // Add non-passive wheel event listener
  canvas.addEventListener('wheel', handleWheelEvent, { passive: false });
  
  return () => {
    canvas.removeEventListener('wheel', handleWheelEvent);
  };
}, []);

  // Load data when viewport changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadMapData();
    }, 100); // Debounce
    
    return () => clearTimeout(timeoutId);
  }, [loadMapData]);

  // Render when data changes
  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(render);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render]);

  return (
  <canvas
    ref={canvasRef}
    width={canvasWidth}
    height={canvasHeight}
    onMouseDown={handleMouseDown}
    onMouseMove={handleMouseMove}
    onMouseUp={handleMouseUp}
    onMouseLeave={handleMouseUp}
    // Remove this line: onWheel={handleWheel}
    style={{
      border: '1px solid #ccc',
      cursor: isDragging ? 'grabbing' : 'grab',
      display: 'block'
    }}
  />
);
};

export default MapCanvas;
