import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';

const BottomBar = () => {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const cursorCoordinates = useSelector(state => state.map.cursorCoordinates);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      width: '100%',
      background: '#222',
      color: '#fff',
      padding: '6px 16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '14px',
      boxShadow: '0 -2px 5px rgba(0,0,0,0.2)',
      fontFamily: 'monospace'
    }}>
      <span>{time}</span>
      {cursorCoordinates.latitude !== null && cursorCoordinates.longitude !== null ? (
        <span>
          Lat: {cursorCoordinates.latitude.toFixed(4)}, Lon: {cursorCoordinates.longitude.toFixed(4)}
        </span>
      ) : (
        <span>Lat: ---, Lon: ---</span>
      )}
    </div>
  );
};

export default BottomBar;
