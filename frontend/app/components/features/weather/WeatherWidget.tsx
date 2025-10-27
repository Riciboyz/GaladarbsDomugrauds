'use client';

import React from 'react';
import { useWeather } from '../../contexts/WeatherContext';

interface WeatherWidgetProps {
  className?: string;
  showDetails?: boolean;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ 
  className = '', 
  showDetails = false 
}) => {
  const { weatherData, weatherTheme, isLoading, error, fetchWeather } = useWeather();

  const getWeatherIcon = (weatherCode: number, isDay: number) => {
    // Weather codes from Open-Meteo API
    if (weatherCode >= 0 && weatherCode <= 2) return isDay ? '☀️' : '🌙';
    if (weatherCode >= 3 && weatherCode <= 48) return '☁️';
    if (weatherCode >= 51 && weatherCode <= 67) return '🌧️';
    if (weatherCode >= 71 && weatherCode <= 77) return '❄️';
    if (weatherCode >= 80 && weatherCode <= 82) return '🌦️';
    if (weatherCode >= 85 && weatherCode <= 86) return '🌨️';
    if (weatherCode >= 95 && weatherCode <= 99) return '⛈️';
    return '🌤️';
  };

  const getWeatherDescription = (weatherCode: number) => {
    if (weatherCode >= 0 && weatherCode <= 2) return 'Skaidrs';
    if (weatherCode >= 3 && weatherCode <= 48) return 'Mākoņains';
    if (weatherCode >= 51 && weatherCode <= 67) return 'Lietains';
    if (weatherCode >= 71 && weatherCode <= 77) return 'Sniegains';
    if (weatherCode >= 80 && weatherCode <= 82) return 'Lietus';
    if (weatherCode >= 85 && weatherCode <= 86) return 'Sniegs';
    if (weatherCode >= 95 && weatherCode <= 99) return 'Pērkons';
    return 'Nezināms';
  };

  if (isLoading) {
    return (
      <div className={`card p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="skeleton w-8 h-8 rounded-full"></div>
          <div className="space-y-2">
            <div className="skeleton w-20 h-4"></div>
            <div className="skeleton w-16 h-3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !weatherData) {
    return (
      <div className={`card p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Laikapstākļi nav pieejami</p>
            <button 
              onClick={() => fetchWeather()}
              className="btn-ghost text-xs mt-1"
            >
              Mēģināt vēlreiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { current } = weatherData;
  const temperature = Math.round(current.temperature_2m);
  const icon = getWeatherIcon(current.weather_code, current.is_day);
  const description = getWeatherDescription(current.weather_code);

  return (
    <div className={`card p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">{icon}</div>
          <div>
            <div className="text-lg font-semibold">{temperature}°C</div>
            <div className="text-sm text-gray-600">{description}</div>
          </div>
        </div>
        
        {showDetails && (
          <div className="text-right text-xs text-gray-500 space-y-1">
            <div>Mitrums: {Math.round(current.relative_humidity_2m)}%</div>
            <div>Vējš: {Math.round(current.wind_speed_10m)} m/s</div>
            <div>Spiediens: {Math.round(current.pressure_msl)} hPa</div>
          </div>
        )}
      </div>
      
      <div className="mt-3 text-xs text-gray-500">
        Atjaunots: {new Date(current.time).toLocaleTimeString('lv-LV')}
      </div>
    </div>
  );
};

export default WeatherWidget;
