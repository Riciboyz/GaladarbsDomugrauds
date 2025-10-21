import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('Weather API: Starting request...');
    const { searchParams } = new URL(request.url);
    const latitude = searchParams.get('lat') || '57.3119'; // Cēsis, Latvia default
    const longitude = searchParams.get('lon') || '25.2746';
    
    console.log('Weather API: Coordinates:', latitude, longitude);

    // Fetch real weather data from Open-Meteo API
    const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,rain,snowfall,weather_code&timezone=auto`;
    
    console.log('Weather API: Fetching from Open-Meteo:', openMeteoUrl);
    
    const response = await fetch(openMeteoUrl);
    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Weather API: Received data from Open-Meteo');
    
    // Transform Open-Meteo data to our format
    const weatherData = {
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        elevation: data.elevation || 0,
        utcOffsetSeconds: data.utc_offset_seconds || 0,
      },
      current: {
        time: new Date(data.current.time),
        temperature_2m: data.current.temperature_2m,
        relative_humidity_2m: data.current.relative_humidity_2m,
        apparent_temperature: data.current.apparent_temperature,
        is_day: data.current.is_day,
        precipitation: data.current.precipitation,
        rain: data.current.rain,
        showers: data.current.showers,
        snowfall: data.current.snowfall,
        weather_code: data.current.weather_code,
        cloud_cover: data.current.cloud_cover,
        pressure_msl: data.current.pressure_msl,
        surface_pressure: data.current.surface_pressure,
        wind_speed_10m: data.current.wind_speed_10m,
        wind_direction_10m: data.current.wind_direction_10m,
        wind_gusts_10m: data.current.wind_gusts_10m,
      },
      hourly: {
        time: data.hourly.time.map((time: string) => new Date(time)),
        temperature_2m: data.hourly.temperature_2m,
        rain: data.hourly.rain,
        snowfall: data.hourly.snowfall,
        weather_code: data.hourly.weather_code,
      },
    };

    console.log('Weather API: Success, returning real weather data');
    console.log('Weather API: Current weather code:', data.current.weather_code);
    console.log('Weather API: Current temperature:', data.current.temperature_2m);
    console.log('Weather API: Is day:', data.current.is_day);
    return NextResponse.json(weatherData);
    
  } catch (error) {
    console.error('Weather API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}