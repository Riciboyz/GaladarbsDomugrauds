'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

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
    // Weather codes from Open-Meteo API
    // 0: Clear sky, 1-2: Partly cloudy, 3: Overcast, 45-48: Fog, 51-67: Drizzle/Rain, 71-77: Snow, 80-82: Rain showers, 85-86: Snow showers, 95-99: Thunderstorm
    
    if (snowfall > 0.1) return 'snowy';
    if (rain > 0.1) return 'rainy';
    if (isDay === 0) return 'night'; // Night time
    if (weatherCode >= 45 && weatherCode <= 48) return 'cloudy'; // Fog
    if (weatherCode >= 3 && weatherCode <= 48) return 'cloudy'; // Cloudy conditions
    if (weatherCode === 1 || weatherCode === 2) return 'cloudy'; // Partly cloudy
    if (weatherCode === 0) return 'sunny'; // Clear sky
    
    return 'default';
  }, []);

  const fetchWeather = useCallback(async (lat: number = 56.9496, lon: number = 24.1052) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:3000/api/weather?lat=${lat}&lon=${lon}`);
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
  }, [getWeatherTheme]);

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
