'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';

export interface WeatherData {
  location: {
    latitude: number;
    longitude: number;
    elevation: number;
    utcOffsetSeconds: number;
  };
  current: {
    time: Date;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    precipitation: number;
    rain: number;
    showers: number;
    snowfall: number;
    weather_code: number;
    cloud_cover: number;
    pressure_msl: number;
    surface_pressure: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
  };
  hourly: {
    time: Date[];
    temperature_2m: number[];
    rain: number[];
    snowfall: number[];
    weather_code: number[];
  };
}

export type WeatherTheme = 'sunny' | 'rainy' | 'cloudy' | 'night' | 'snowy' | 'default';

interface WeatherContextType {
  weatherData: WeatherData | null;
  weatherTheme: WeatherTheme;
  isLoading: boolean;
  error: string | null;
  fetchWeather: (lat?: number, lon?: number) => Promise<void>;
  setWeatherTheme: (theme: WeatherTheme) => void;
  getWeatherTheme: (weatherCode: number, isDay: number, temperature: number, rain: number, snowfall: number) => WeatherTheme;
}

const WeatherContext = createContext<WeatherContextType | undefined>(undefined);

export const useWeather = () => {
  const context = useContext(WeatherContext);
  if (context === undefined) {
    throw new Error('useWeather must be used within a WeatherProvider');
  }
  return context;
};

interface WeatherProviderProps {
  children: ReactNode;
}

export const WeatherProvider: React.FC<WeatherProviderProps> = ({ children }) => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherTheme, setWeatherTheme] = useState<WeatherTheme>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);

  // Load saved theme from localStorage on mount
  useEffect(() => {
    // Check if we're on the client side
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('weatherTheme') as WeatherTheme;
      if (savedTheme && ['sunny', 'rainy', 'cloudy', 'night', 'snowy', 'default'].includes(savedTheme)) {
        console.log('WeatherContext: Loading saved theme from localStorage:', savedTheme);
        setWeatherTheme(savedTheme);
      }

      // Listen for storage changes (when theme is changed in another tab)
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'weatherTheme' && e.newValue) {
          const newTheme = e.newValue as WeatherTheme;
          if (['sunny', 'rainy', 'cloudy', 'night', 'snowy', 'default'].includes(newTheme)) {
            console.log('WeatherContext: Theme changed in another tab:', newTheme);
            setWeatherTheme(newTheme);
          }
        }
      };

      window.addEventListener('storage', handleStorageChange);
      
      return () => {
        window.removeEventListener('storage', handleStorageChange);
      };
    }
  }, []);

  const getWeatherTheme = useCallback((
    weatherCode: number, 
    isDay: number, 
    temperature: number, 
    rain: number, 
    snowfall: number
  ): WeatherTheme => {
    // Open-Meteo weather codes mapping (0-99)
    
    // Snow conditions
    if (snowfall > 0.1 || (weatherCode >= 71 && weatherCode <= 77) || (weatherCode >= 85 && weatherCode <= 86)) return 'snowy';
    
    // Rain conditions
    if (rain > 0.1 || (weatherCode >= 51 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 82)) return 'rainy';
    
    // Thunderstorm conditions
    if (weatherCode >= 95 && weatherCode <= 99) return 'rainy';
    
    // Night time
    if (isDay === 0) return 'night';
    
    // Clear sky conditions (0-2)
    if (weatherCode >= 0 && weatherCode <= 2) return 'sunny';
    
    // Cloudy conditions (3-48)
    if (weatherCode >= 3 && weatherCode <= 48) return 'cloudy';
    
    // Default to cloudy for unknown conditions
    return 'cloudy';
  }, []);

  const fetchWeather = useCallback(async (lat: number = 57.3119, lon: number = 25.2746) => {
    // Cache weather data for 10 minutes to prevent excessive API calls
    const now = Date.now();
    const cacheTime = 10 * 60 * 1000; // 10 minutes
    
    if (weatherData && (now - lastFetchRef.current) < cacheTime) {
      console.log('WeatherContext: Using cached weather data');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    lastFetchRef.current = now;
    
    try {
      const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
      if (!response.ok) {
        throw new Error('Failed to fetch weather data');
      }
      
      const data = await response.json();
      setWeatherData(data);
      
      // Only set theme if no manual theme is saved in localStorage
      if (typeof window !== 'undefined') {
        const savedTheme = localStorage.getItem('weatherTheme');
        if (!savedTheme || savedTheme === 'default') {
          // Determine weather theme
          const theme = getWeatherTheme(
            data.current.weather_code,
            data.current.is_day,
            data.current.temperature_2m,
            data.current.rain,
            data.current.snowfall
          );
          console.log('WeatherContext: Weather data:', data.current);
          console.log('WeatherContext: Determined theme:', theme);
          setWeatherTheme(theme);
        } else {
          console.log('WeatherContext: Using saved theme from localStorage:', savedTheme);
        }
      } else {
        // Server side - determine theme normally
        const theme = getWeatherTheme(
          data.current.weather_code,
          data.current.is_day,
          data.current.temperature_2m,
          data.current.rain,
          data.current.snowfall
        );
        console.log('WeatherContext: Weather data:', data.current);
        console.log('WeatherContext: Determined theme:', theme);
        setWeatherTheme(theme);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Weather fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getWeatherTheme, weatherData]);

  // Function to manually set theme and save to localStorage
  const setWeatherThemeManual = useCallback((theme: WeatherTheme) => {
    console.log('WeatherContext: Setting manual theme:', theme);
    setWeatherTheme(theme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('weatherTheme', theme);
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('weatherThemeChanged', { detail: theme }));
    }
  }, []);

  // Weather fetching is now handled by GlobalWeatherTheme component

  const value: WeatherContextType = {
    weatherData,
    weatherTheme,
    isLoading,
    error,
    fetchWeather,
    setWeatherTheme: setWeatherThemeManual, // Use the manual function that saves to localStorage
    getWeatherTheme,
  };

  return (
    <WeatherContext.Provider value={value}>
      {children}
    </WeatherContext.Provider>
  );
};
