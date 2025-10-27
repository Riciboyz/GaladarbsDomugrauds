'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useWeather } from '../../contexts/WeatherContext';

interface WeatherEffectsProps {
  className?: string;
}

const WeatherEffects: React.FC<WeatherEffectsProps> = ({ className = '' }) => {
  const { weatherTheme } = useWeather();
  const [particles, setParticles] = useState<Array<{ id: number; left: number; delay: number }>>([]);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load persisted audio preference
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('sunnyAudioEnabled');
      if (stored === 'true') setAudioEnabled(true);
    } catch {}
  }, []);

  // Try to play/pause audio on changes
  useEffect(() => {
    if (!audioRef.current) return;
    if (weatherTheme !== 'sunny') {
      audioRef.current.pause();
      return;
    }
    if (audioEnabled) {
      audioRef.current.volume = 0.25;
      audioRef.current.play().catch(() => {
        // Autoplay likely blocked; will play on next user interaction
      });
    } else {
      audioRef.current.pause();
    }
  }, [audioEnabled, weatherTheme]);

  const onToggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    try { localStorage.setItem('sunnyAudioEnabled', String(next)); } catch {}
  };

  useEffect(() => {
    if (weatherTheme === 'rainy' || weatherTheme === 'snowy') {
      // Generate particles for rain or snow
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2,
      }));
      setParticles(newParticles);

      // Regenerate particles periodically
      const interval = setInterval(() => {
        setParticles(prev => 
          prev.map(particle => ({
            ...particle,
            left: Math.random() * 100,
            delay: Math.random() * 2,
          }))
        );
      }, 3000);

      return () => clearInterval(interval);
    } else {
      setParticles([]);
    }
  }, [weatherTheme]);

  if (weatherTheme === 'default') {
    return null;
  }

  return (
    <div className={`weather-effects ${weatherTheme} ${className}`}>
      {/* sunny visual scene removed to avoid obstructing content */}
      {weatherTheme === 'sunny' && (
        <>
          <audio
            ref={audioRef}
            src="/assets/audio/birds.mp3"
            loop
            preload="none"
          />
          <button
            type="button"
            aria-label={audioEnabled ? 'Izslēgt putnu skaņas' : 'Ieslēgt putnu skaņas'}
            onClick={onToggleAudio}
            className="fixed bottom-4 right-4 z-50 btn-secondary shadow-lg"
            style={{ backdropFilter: 'blur(8px)' }}
          >
            {audioEnabled ? '🔊 Birds' : '🔈 Birds'}
          </button>
        </>
      )}
      {weatherTheme === 'rainy' && (
        <div className="rain">
          <div className="left" />
          <div className="left center" />
          <div className="right center" />
          <div className="right" />
          {Array.from({ length: 500 }, (_, i) => (
            <div key={i} className="drop" />
          ))}
        </div>
      )}
      
          {weatherTheme === 'snowy' && (
            <div className="snow">
              {Array.from({ length: 50 }, (_, i) => (
                <div key={i}>&#10052;</div>
              ))}
            </div>
          )}
      {weatherTheme === 'cloudy' && (
        <div id="clouds">
          <div className="cloud x1"></div>
          <div className="cloud x2"></div>
          <div className="cloud x3"></div>
          <div className="cloud x4"></div>
          <div className="cloud x5"></div>
          <div className="cloud x6"></div>
          <div className="cloud x7"></div>
          <div className="cloud x8"></div>
          <div className="cloud x9"></div>
          <div className="cloud x10"></div>
        </div>
      )}
    </div>
  );
};

export default WeatherEffects;