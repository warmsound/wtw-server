/*
SELECT forecasts.query_time, forecasts.forecast_time, forecasts.weather_code, temp
FROM forecasts
WHERE service_id = 30 AND location_id = 1 AND forecast_time BETWEEN "2014-03-02T00:00:00.000Z" AND "2014-03-02T12:00:00.000Z"
*/

/*
SELECT weather_icons.name
FROM weather_icons
WHERE weather_icons.id = 2
*/

/*
SELECT service_weather_codes.weather_icon_id
FROM service_weather_codes
WHERE service_weather_codes.service_id = 0 AND service_weather_codes.weather_code = 14
*/

/*
SELECT weather_icons.name
FROM weather_icons
WHERE weather_icons.id = (
      SELECT service_weather_codes.weather_icon_id
      FROM service_weather_codes
      WHERE service_weather_codes.service_id = 0 AND service_weather_codes.weather_code = 14
)
*/    
