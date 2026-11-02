import React, { useEffect, useRef } from 'react';
import './charts.js';

/**
 * Tekent een SVG-grafiek met de helper uit charts.js. `draw(Charts, host, legendHost)` krijgt de
 * gemonteerde elementen; de legenda komt uit dezelfde stijlobjecten als de marks, zodat elk
 * swatch de mark zelf is.
 */
export default function Chart({ draw, deps = [], label, legend = false, className = 'chart' }) {
 const host = useRef(null);
 const legendHost = useRef(null);

 useEffect(() => {
  const element = host.current;
  if (!element || !window.Charts) return;
  element.replaceChildren();
  if (legendHost.current) legendHost.current.replaceChildren();
  draw(window.Charts, element, legendHost.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, deps);

 return <>
  <div className={className} ref={host} aria-label={label} />
  {legend && <div className="legend" ref={legendHost} />}
 </>;
}
