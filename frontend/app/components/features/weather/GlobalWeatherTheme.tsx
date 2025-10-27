'use client';

import React, { useEffect } from 'react';
import { useWeather } from '../../contexts/WeatherContext';
import WeatherEffects from './WeatherEffects';

interface GlobalWeatherThemeProps {
  children: React.ReactNode;
}

const GlobalWeatherTheme: React.FC<GlobalWeatherThemeProps> = ({ children }) => {
  const { weatherTheme, isLoading, fetchWeather } = useWeather();

  // Fetch weather data on mount
  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  // Listen for theme changes from other components
  useEffect(() => {
    const handleThemeChange = (event: CustomEvent) => {
      console.log('GlobalWeatherTheme: Theme changed via custom event:', event.detail);
      // The theme will be updated automatically via context
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('weatherThemeChanged', handleThemeChange as EventListener);
      
      return () => {
        window.removeEventListener('weatherThemeChanged', handleThemeChange as EventListener);
      };
    }
  }, []);

  useEffect(() => {
    // Apply weather theme to body element
    const body = document.body;
    
    console.log('GlobalWeatherTheme: Applying theme:', weatherTheme);
    console.log('GlobalWeatherTheme: Current body classes:', body.className);
    
    // Remove all existing weather classes
    body.classList.remove('sunny', 'rainy', 'cloudy', 'night', 'snowy', 'weather-sunny', 'weather-rainy', 'weather-cloudy', 'weather-night', 'weather-snowy');
    console.log('GlobalWeatherTheme: Removed all weather classes');
    
        // Add current weather theme class
        if (weatherTheme !== 'default') {
          body.classList.add(weatherTheme);
          body.classList.add(`weather-${weatherTheme}`);
          body.classList.add('weather-theme-transition');
          console.log('GlobalWeatherTheme: Added classes:', weatherTheme, `weather-${weatherTheme}`);
          console.log('GlobalWeatherTheme: New body classes:', body.className);
          
          // Force a re-render by updating the style
          body.style.setProperty('--weather-theme', weatherTheme);
        } else {
          console.log('GlobalWeatherTheme: Using default theme, no class added');
          body.classList.remove('weather-theme-transition');
        }
    
    // Update CSS custom properties for smooth transitions
    body.style.transition = 'all 0.5s ease-in-out';
    
    return () => {
      // Cleanup on unmount
      body.classList.remove('sunny', 'rainy', 'cloudy', 'night', 'snowy', 'weather-sunny', 'weather-rainy', 'weather-cloudy', 'weather-night', 'weather-snowy');
      body.style.transition = '';
    };
  }, [weatherTheme]);

  return (
    <>
      <WeatherEffects />
      {children}
    </>
  );
};

export default GlobalWeatherTheme;