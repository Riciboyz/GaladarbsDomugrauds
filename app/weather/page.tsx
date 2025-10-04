'use client';

import { useWeather } from '../contexts/WeatherContext';
import WeatherWidget from '../components/WeatherWidget';

export default function WeatherPage() {
  const { weatherData, weatherTheme, isLoading, error, fetchWeather, setWeatherTheme } = useWeather();

  return (
    <div className="min-h-screen dg-bg p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="heading-1 mb-8">Laikapstākļu demonstrācija</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <WeatherWidget showDetails={true} />
          
          <div className="card p-6">
            <h2 className="heading-3 mb-4">Pašreizējā tēma</h2>
            <div className="space-y-2">
              <p><strong>Tēma:</strong> {weatherTheme}</p>
              <p><strong>Ielādēšana:</strong> {isLoading ? 'Jā' : 'Nē'}</p>
              <p><strong>Kļūda:</strong> {error || 'Nav'}</p>
            </div>
            <div className="space-y-2">
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('weatherTheme');
                  }
                  setWeatherTheme('default');
                  fetchWeather();
                }}
                className="btn-primary w-full"
              >
                Atiestatīt uz automātisko
              </button>
              <button 
                onClick={() => {
                  // Reset to default theme and fetch real weather
                  setWeatherTheme('default');
                  fetchWeather();
                }}
                className="btn-secondary w-full"
              >
                Atiestatīt uz noklusējumu
              </button>
            </div>
          </div>
        </div>

        {weatherData && (
          <div className="card p-6">
            <h2 className="heading-3 mb-4">Detalizēta informācija</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="heading-4 mb-2">Pašreizējie apstākļi</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Temperatūra:</strong> {Math.round(weatherData.current.temperature_2m)}°C</p>
                  <p><strong>Jutamā temperatūra:</strong> {Math.round(weatherData.current.apparent_temperature)}°C</p>
                  <p><strong>Mitrums:</strong> {Math.round(weatherData.current.relative_humidity_2m)}%</p>
                  <p><strong>Mākoņu segums:</strong> {Math.round(weatherData.current.cloud_cover)}%</p>
                  weather   <p><strong>Vēja ātrums:</strong> {Math.round(weatherData.current.wind_speed_10m)} m/s</p>
                  <p><strong>Spiediens:</strong> {Math.round(weatherData.current.pressure_msl)} hPa</p>
                </div>
              </div>
              
              <div>
                <h3 className="heading-4 mb-2">Nokrišņi</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Lietus:</strong> {weatherData.current.rain} mm</p>
                  <p><strong>Lietus dušas:</strong> {weatherData.current.showers} mm</p>
                  <p><strong>Sniegs:</strong> {weatherData.current.snowfall} mm</p>
                  <p><strong>Kopējie nokrišņi:</strong> {weatherData.current.precipitation} mm</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 card p-6">
          <h2 className="heading-3 mb-4">Dizaina tēmas</h2>
          <p className="text-sm text-gray-600 mb-4">Noklikšķiniet uz tēmas, lai to testētu:</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {['sunny', 'rainy', 'cloudy', 'night', 'snowy'].map(theme => (
              <button
                key={theme}
                onClick={() => setWeatherTheme(theme as any)}
                className={`text-center p-3 rounded-xl border-2 transition-all hover:scale-105 ${
                  weatherTheme === theme ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-16 h-16 mx-auto rounded-xl mb-2 weather-${theme}`}></div>
                <p className="text-sm capitalize font-medium">{theme}</p>
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">
                <strong>Piezīme:</strong> Tēmas izmaiņas ir tikai vizuālas testēšanai. 
                Reālā tēma tiek noteikta automātiski pēc pašreizējiem laikapstākļiem.
              </p>
            </div>
            
            <div className="p-3 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">Testēt ar simulētiem datiem:</h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setWeatherTheme('rainy')}
                  className="btn-ghost text-xs py-2"
                >
                  🌧️ Lietains
                </button>
                <button
                  onClick={() => setWeatherTheme('snowy')}
                  className="btn-ghost text-xs py-2"
                >
                  ❄️ Sniegains
                </button>
                <button
                  onClick={() => setWeatherTheme('night')}
                  className="btn-ghost text-xs py-2"
                >
                  🌙 Nakts
                </button>
                <button
                  onClick={() => setWeatherTheme('cloudy')}
                  className="btn-ghost text-xs py-2"
                >
                  ☁️ Mākoņains
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}