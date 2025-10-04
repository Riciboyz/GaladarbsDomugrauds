'use client';

import React, { useEffect, useState } from 'react';
import { useWeather } from '../contexts/WeatherContext';

interface WeatherEffectsProps {
  className?: string;
}

const WeatherEffects: React.FC<WeatherEffectsProps> = ({ className = '' }) => {
  const { weatherTheme } = useWeather();
  const [particles, setParticles] = useState<Array<{ id: number; left: number; delay: number }>>([]);

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
      {weatherTheme === 'sunny' && (
        <div className="sunny-field" aria-hidden>
          <input type="checkbox" id="gfxmenu" readOnly />
          <input type="radio" name="gfx" id="good" defaultChecked readOnly />
          <input type="radio" name="gfx" id="okay" readOnly />
          <input type="radio" name="gfx" id="dq" readOnly />
          <input type="radio" name="gfx" id="mobile" readOnly />
          <input type="checkbox" name="sfx" id="sound" readOnly />

          <div>
            <div id="main">
              <div>
                <x>
                  <y>
                    <z>
                      <distant>
                        <sky>
                          {Array.from({ length: 15 }).map((_, i) => (
                            <u key={`s1-${i}`} />
                          ))}
                        </sky>
                        <sky2>
                          {Array.from({ length: 6 }).map((_, i) => (
                            <u key={`s2-${i}`} />
                          ))}
                        </sky2>
                        <trees>
                          <l>
                            {Array.from({ length: 8 }).map((_, i) => (
                              <u key={`t1-${i}`} />
                            ))}
                            <s />
                          </l>
                          <l>
                            {Array.from({ length: 4 }).map((_, i) => (
                              <u key={`t2-${i}`} />
                            ))}
                          </l>
                          <l>
                            {Array.from({ length: 13 }).map((_, i) => (
                              <u key={`t3-${i}`} />
                            ))}
                          </l>
                          <l>
                            {Array.from({ length: 3 }).map((_, i) => (
                              <u key={`t4-${i}`} />
                            ))}
                            <tree />
                          </l>
                          <l>
                            <u />
                          </l>
                          <l>
                            {Array.from({ length: 18 }).map((_, i) => (
                              <u key={`t6-${i}`} />
                            ))}
                          </l>
                        </trees>
                      </distant>
                      <field>
                        {Array.from({ length: 7 }).map((_, i) => (
                          <l key={`f-${i}`} />
                        ))}
                        <plain />
                        <grass>
                          {Array.from({ length: 4 }).map((_, gi) => (
                            <g key={`g-${gi}`}>
                              {Array.from({ length: 6 }).map((_, ui) => (
                                <u key={`gu-${gi}-${ui}`} />
                              ))}
                            </g>
                          ))}
                          {Array.from({ length: 3 }).map((_, gi) => (
                            <g2 key={`g2-${gi}`}>
                              {Array.from({ length: 6 }).map((_, ui) => (
                                <u key={`g2u-${gi}-${ui}`} />
                              ))}
                            </g2>
                          ))}
                        </grass>
                        <bugs>
                          <u />
                          <u />
                          <u />
                        </bugs>
                      </field>
                    </z>
                  </y>
                </x>
              </div>
            </div>
            <div id="cover" />
          </div>
        </div>
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
    </div>
  );
};

export default WeatherEffects;