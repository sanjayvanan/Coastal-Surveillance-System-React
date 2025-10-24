// ScaleDisplay.jsx — no "k" in scale ratio; allow "M"; meters/km unchanged

import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';

const EARTH_RADIUS = 6378137;          // meters
const INCHES_PER_METER = 39.37007874;
const CSS_DPI = 96;
const TILE_SIZE = 512;

const OVERZOOM_FACTOR = 2.0;
const SCAMIN_FACTOR  = 2.0;
const DEFAULT_COMPILATION_SCALE = 250000;

function metersPerPixel(latDeg, zoom) {
  const phi = (latDeg * Math.PI) / 180;
  const worldMeters = 2 * Math.PI * EARTH_RADIUS * Math.cos(phi);
  const pixelsPerWorld = TILE_SIZE * Math.pow(2, zoom);
  return worldMeters / pixelsPerWorld;
}
function deviceDPI() {
  if (typeof window === 'undefined') return CSS_DPI;
  return CSS_DPI * (window.devicePixelRatio || 1);
}
function scaleDenominator(latDeg, zoom) {
  const mpp = metersPerPixel(latDeg, zoom);
  const dotsPerMeter = deviceDPI() * INCHES_PER_METER;
  return mpp * dotsPerMeter;
}
function neatDistance(meters) {
  if (meters <= 0) return 0;
  const pow10 = Math.pow(10, Math.floor(Math.log10(meters)));
  const frac = meters / pow10;
  const step = frac >= 5 ? 5 : frac >= 2 ? 2 : 1;
  return step * pow10;
}

// ⇩⇩ CHANGED: never use "k" for thousands; allow "M" for millions only
function formatRatio(n) {
  if (!Number.isFinite(n) || n <= 0) return '1:—';
  if (n >= 1_000_000) return `1:${(n / 1_000_000).toFixed(1)}M`;
  // For anything below 1,000,000, show the full number with thousands separators
  return `1:${Math.round(n).toLocaleString()}`;
}

function formatDistance(m) {
  if (m >= 1000) return `${(m / 1000).toFixed(m >= 10_000 ? 0 : 1)} km`;
  if (m >= 1)    return `${Math.round(m)} m`;
  return `${(m * 100).toFixed(0)} cm`;
}

export default function ScaleDisplay() {
  const { latitude, zoom } = useSelector((s) => s.map.viewState);
  const compilationScale =
    useSelector((s) => s.map?.compilationScale) || DEFAULT_COMPILATION_SCALE;

  const maxBarWidthPx = 120;

  const {
    barWidthPx,
    distanceText,
    ratioText,
    showScamin,
    showOverzoom
  } = useMemo(() => {
    const n = scaleDenominator(latitude, zoom);

    const mpp = metersPerPixel(latitude, zoom);
    const maxMeters = maxBarWidthPx * mpp;
    const neatMeters = neatDistance(maxMeters);
    const barWidth = neatMeters / mpp;

    const overzoom = (compilationScale / n) > OVERZOOM_FACTOR;
    const scamin   = (n / compilationScale) > SCAMIN_FACTOR;

    return {
      barWidthPx: barWidth,
      distanceText: formatDistance(neatMeters), // meters / km only (no "k")
      ratioText: formatRatio(n),                // no "k"; "M" allowed
      showScamin: scamin,
      showOverzoom: overzoom
    };
  }, [latitude, zoom, compilationScale]);

  return (
    <div className="scale-display-container" style={{ userSelect: 'none' }}>
      <div className="scale-text-above">{distanceText}</div>
      <div className="scale-bar" style={{ width: `${barWidthPx}px` }} />
      <div className="scale-text-below">
        {ratioText}
        {showOverzoom && <span className="oz-indicator" title="OverZoom > 2×"> • OZ</span>}
        {showScamin   && <span className="scamin-indicator" title="SCAMIN active > 2×"> • SCAMIN</span>}
      </div>
    </div>
  );
}
