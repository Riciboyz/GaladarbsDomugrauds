import { NextRequest, NextResponse } from 'next/server';
import { fetchWeatherApi } from 'openmeteo';

export async function GET(request: NextRequest) {
  try {
    console.log('Weather API: Starting request...');
    const { searchParams } = new URL(request.url);
    const latitude = searchParams.get('lat') || '56.9496'; // Riga, Latvia default
    const longitude = searchParams.get('lon') || '24.1052';
    
    console.log('Weather API: Coordinates:', latitude, longitude);

    // Simulated weather data for testing (since Open-Meteo API has rate limits)
    const weatherData = {
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        elevation: 17,
        utcOffsetSeconds: 0,
      },
      current: {
        time: new Date(),
        temperature_2m: 12.7,
        relative_humidity_2m: 40,
        apparent_temperature: 9.2,
        is_day: 1,
        precipitation: 0,
        rain: 0,
        showers: 0,
        snowfall: 0,
        weather_code: 2, // Partly cloudy
        cloud_cover: 77,
        pressure_msl: 1036.7,
        surface_pressure: 1034.6,
        wind_speed_10m: 9,
        wind_direction_10m: 94,
        wind_gusts_10m: 22.7,
      },
      hourly: {
        time: Array.from({ length: 24 }, (_, i) => new Date(Date.now() + i * 60 * 60 * 1000)),
        temperature_2m: Array.from({ length: 24 }, (_, i) => 12 + Math.sin(i / 24 * Math.PI * 2) * 5),
        rain: Array.from({ length: 24 }, () => 0),
        snowfall: Array.from({ length: 24 }, () => 0),
        weather_code: Array.from({ length: 24 }, () => 2),
      },
    };

    console.log('Weather API: Success, returning simulated data');
    return NextResponse.json(weatherData);
  } catch (error) {
    console.error('Weather API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}