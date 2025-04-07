"use client"

import React, { useEffect, useState } from 'react';

const SEED = 12345; // Fixed seed for consistent random values

// Consistent random number generator
function seededRandom(seed: number) {
  return (seed * 9301 + 49297) % 233280 / 233280;
}

function Waveform() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const createWave = (index: number) => {
    // Use seed for consistent random values
    const height = 20 + seededRandom(SEED + index) * 80;
    const opacity = 0.2 + seededRandom(SEED + index * 2) * 0.4;
    const animationDuration = 1 + seededRandom(SEED + index * 3) * 2;

    return {
      height: `${height}px`,
      opacity,
      animation: `wave ${animationDuration}s infinite alternate`
    };
  };

  if (!isHydrated) {
    return null;
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-900 to-transparent z-10"></div>
      {[...Array(50)].map((_, i) => (
        <div 
          key={i}
          className="absolute rounded-sm bg-indigo-500/20"
          style={{
            width: '2px',
            bottom: '0',
            left: `${i * 2}%`,
            ...createWave(i)
          }}
        />
      ))}
    </div>
  );
}

export default Waveform;
