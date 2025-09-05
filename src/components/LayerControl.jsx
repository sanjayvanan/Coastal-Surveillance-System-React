import React from 'react';

const LayerControl = ({ layers, selectedLayers, onLayerToggle, onRegenerateVectorTiles }) => {
  if (!layers || layers.length === 0) {
    return (
      <div className="layer-control">
        <h3>Layers</h3>
        <p>Loading layers...</p>
      </div>
    );
  }

  return (
    <div className="layer-control">
      <div className="layer-control-header">
        <h3>Map Layers ({layers.length})</h3>
        <button 
          onClick={onRegenerateVectorTiles}
          className="regenerate-btn"
          title="Regenerate vector tiles"
        >
          🔄 Regenerate Tiles
        </button>
      </div>
      
      <div className="layer-list">
        {layers.map(layer => {
          const isSelected = selectedLayers.includes(layer.name);
          
          return (
            <div 
              key={layer.name} 
              className={`layer-item ${isSelected ? 'selected' : ''}`}
            >
              <label className="layer-label">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onLayerToggle(layer.name)}
                />
                
                <div className="layer-info">
                  <span className="layer-name">{layer.name}</span>
                  
                  {layer.color && (
                    <div 
                      className="layer-color"
                      style={{
                        backgroundColor: layer.color.hex || 
                          `rgb(${layer.color.r}, ${layer.color.g}, ${layer.color.b})`
                      }}
                    />
                  )}
                  
                  <div className="layer-stats">
                    {layer.polygonCount > 0 && (
                      <span className="stat">📐 {layer.polygonCount}</span>
                    )}
                    {layer.pointCount > 0 && (
                      <span className="stat">📍 {layer.pointCount}</span>
                    )}
                  </div>
                </div>
              </label>
            </div>
          );
        })}
      </div>
      
      <div className="layer-control-footer">
        <p className="layer-summary">
          {selectedLayers.length} of {layers.length} layers visible
        </p>
      </div>
    </div>
  );
};

export default LayerControl;
