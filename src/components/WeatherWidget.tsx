import { Cloud, Sun, CloudRain, CloudSnow, Wind } from 'lucide-react';
import { useEffect, useState } from 'react';

const WeatherWidget = () => {
  const [data, setData] = useState({
    temperature: 0,
    condition: '',
    location: '',
    humidity: 0,
    windSpeed: 0,
    icon: '',
    temperatureUnit: 'C',
    windSpeedUnit: 'm/s',
  });

  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const getApproxLocation = async () => {
    try {
      const res = await fetch('https://ipwhois.app/json/');
      const data = await res.json();

      return {
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city,
      };
    } catch (error) {
      console.error('Failed to get approximate location:', error);
      return null;
    }
  };

  const getLocation = async (
    callback: (location: {
      latitude: number;
      longitude: number;
      city: string;
    }) => void,
  ) => {
    if (navigator.geolocation) {
      let result: PermissionStatus | null = null;
      try {
        if (navigator.permissions && navigator.permissions.query) {
          result = await navigator.permissions.query({
            name: 'geolocation',
          });
        }
      } catch (e) {
        console.warn('Permissions API not supported or failed:', e);
      }

      if (result && result.state === 'granted') {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const res = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`,
                {
                  method: 'GET',
                },
              );

              if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

              const data = await res.json();

              callback({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                city: data.locality || data.city || 'Your Location',
              });
            } catch (error) {
              console.error('Failed to reverse geocode, using GPS coords:', error);
              // Still use the valid GPS coordinates even if reverse geocoding fails
              callback({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                city: 'Your Location',
              });
            }
          },
          async (error) => {
            console.error('Geolocation error:', error);
            const approx = await getApproxLocation();
            if (approx) {
              callback(approx);
            } else {
              setHasError(true);
              setLoading(false);
            }
          },
          { timeout: 10000 },
        );
      } else if (result && result.state === 'prompt') {
        const approx = await getApproxLocation();
        if (approx) {
          callback(approx);
        } else {
          setHasError(true);
          setLoading(false);
        }
        navigator.geolocation.getCurrentPosition((position) => {});
      } else if (result && result.state === 'denied') {
        const approx = await getApproxLocation();
        if (approx) {
          callback(approx);
        } else {
          setHasError(true);
          setLoading(false);
        }
      } else if (!result) {
        // Fallback for missing permissions API: try to get position directly
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const res = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`,
                { method: 'GET' },
              );
              const data = await res.json();
              callback({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                city: data.locality || data.city || 'Your Location',
              });
            } catch (error) {
              // Still use the valid GPS coordinates
              callback({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                city: 'Your Location',
              });
            }
          },
          async () => {
            const approx = await getApproxLocation();
            if (approx) {
              callback(approx);
            } else {
              setHasError(true);
              setLoading(false);
            }
          },
          { timeout: 10000 },
        );
      }
    } else {
      const approx = await getApproxLocation();
      if (approx) {
        callback(approx);
      } else {
        setHasError(true);
        setLoading(false);
      }
    }
  };

  const updateWeather = async () => {
    getLocation(async (location) => {
      try {
        const res = await fetch(`/api/weather`, {
          method: 'POST',
          body: JSON.stringify({
            lat: location.latitude,
            lng: location.longitude,
            measureUnit: localStorage.getItem('measureUnit') ?? 'Metric',
          }),
        });

        if (res.status !== 200) {
          setHasError(true);
          setLoading(false);
          return;
        }

        const data = await res.json();

        setData({
          temperature: data.temperature,
          condition: data.condition,
          location: location.city,
          humidity: data.humidity,
          windSpeed: data.windSpeed,
          icon: data.icon,
          temperatureUnit: data.temperatureUnit,
          windSpeedUnit: data.windSpeedUnit,
        });
      } catch (error) {
        console.error('Failed to update weather:', error);
        setHasError(true);
      } finally {
        setLoading(false);
      }
    });
  };

  useEffect(() => {
    updateWeather();
    const intervalId = setInterval(() => {
      if (!hasError) updateWeather();
    }, 30 * 1000);
    return () => clearInterval(intervalId);
  }, [hasError]);

  if (hasError) return null;

  return (
    <div className="bg-light-secondary dark:bg-dark-secondary rounded-2xl border border-light-200 dark:border-dark-200 shadow-sm shadow-light-200/10 dark:shadow-black/25 flex flex-row items-center w-full h-24 min-h-[96px] max-h-[96px] px-3 py-2 gap-3">
      {loading ? (
        <>
          <div className="flex flex-col items-center justify-center w-16 min-w-16 max-w-16 h-full animate-pulse">
            <div className="h-10 w-10 rounded-full bg-light-200 dark:bg-dark-200 mb-2" />
            <div className="h-4 w-10 rounded bg-light-200 dark:bg-dark-200" />
          </div>
          <div className="flex flex-col justify-between flex-1 h-full py-1 animate-pulse">
            <div className="flex flex-row items-center justify-between">
              <div className="h-3 w-20 rounded bg-light-200 dark:bg-dark-200" />
              <div className="h-3 w-12 rounded bg-light-200 dark:bg-dark-200" />
            </div>
            <div className="h-3 w-16 rounded bg-light-200 dark:bg-dark-200 mt-1" />
            <div className="flex flex-row justify-between w-full mt-auto pt-1 border-t border-light-200 dark:border-dark-200">
              <div className="h-3 w-16 rounded bg-light-200 dark:bg-dark-200" />
              <div className="h-3 w-8 rounded bg-light-200 dark:bg-dark-200" />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col items-center justify-center w-16 min-w-16 max-w-16 h-full">
            <img
              src={`/weather-ico/${data.icon}.svg`}
              alt={data.condition}
              className="h-10 w-auto"
            />
            <span className="text-base font-semibold text-black dark:text-white">
              {data.temperature}°{data.temperatureUnit}
            </span>
          </div>
          <div className="flex flex-col justify-between flex-1 h-full py-2">
            <div className="flex flex-row items-center justify-between">
              <span className="text-sm font-semibold text-black dark:text-white">
                {data.location}
              </span>
              <span className="flex items-center text-xs text-black/60 dark:text-white/60 font-medium">
                <Wind className="w-3 h-3 mr-1" />
                {data.windSpeed} {data.windSpeedUnit}
              </span>
            </div>
            <span className="text-xs text-black/50 dark:text-white/50 italic">
              {data.condition}
            </span>
            <div className="flex flex-row justify-between w-full mt-auto pt-2 border-t border-light-200/50 dark:border-dark-200/50 text-xs text-black/50 dark:text-white/50 font-medium">
              <span>Humidity {data.humidity}%</span>
              <span className="font-semibold text-black/70 dark:text-white/70">
                Now
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WeatherWidget;
