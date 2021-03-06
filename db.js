var db = (function() {
  var fs = require('fs');
  var async = require('async');
  var sqlite3 = require('sqlite3').verbose();
  var winston = require('winston');
  var sqlDb = null;
  
  /*
  var sql = require('sql');
  var weather_icons = sql.define({
    name: 'weather_icons',
    columns: ['id', 'name']
  });
  var service_weather_codes = sql.define({
    name: 'service_weather_codes',
    columns: ['id', 'service_id', 'weather_code', 'weather_icon_id']
  });
  var forecasts = sql.define({
    name: 'forecasts',
    columns: ['id', 'location_id', 'service_id', 'query_time', 'forecast_time', 'weather_code', 'temp', 'temp_hi', 'temp_lo', 'wind_speed', 'wind_dir']
  });
  */
  
  var wi = require('./weather-icons');
  
  function getWeatherIconIds (callback) {
    var weatherIconIds = {};
    winston.info('Reading weather icon IDs');
    sqlDb.each('SELECT * from weather_icons',
      function (err, row) {
        weatherIconIds[row.name] = row.id;
      },
      function (err, count) {
        wi.setIconIds(weatherIconIds);
        callback(err);
      });
  };
  
  // Database should already be in serial mode
  function populateWeatherIcons (callback) {
    winston.info('Populating weather icons');
    
    var icons = wi.getIconNames();
    var statement = sqlDb.prepare('INSERT INTO weather_icons (name) VALUES (?)');
    var i;
    for (i = 0; i < icons.length; ++i) {
      statement.run(icons[i]);
    }
    statement.finalize(function (err) { callback(err); });
  };
  
  // Generate results table. forecastTimes is sorted array of unique forecast
  // times (typically displayed on X-axis). aheadTimes is sorted array of
  // differences between forecast and query times, longest first (typically
  // displayed on Y-axis). forecasts is sparse 2D array of forecasts.
  function generateResults (service, location, observations, forecasts)
  {
    var results = { service: {}, location: {}, forecastTimes: [], aheadTimes: [], forecasts: [] }; 
    var uniqueForecastTimes = {}, uniqueAheadTimes = {};
    var forecastTimeIndices = {}, aheadTimeIndices = {};
    var forecastTimeIndex, aheadTimeIndex;
    var forecastTime, queryTime, aheadTime, observationTime;
    var i, j;
    
    results.service.name = service.desc;
    results.service.forecastFreq = service.forecast_freq_hrs;
    
    results.location.name = location.name;
    results.location.lat = location.lat;
    results.location.long = location.long;
    
    // Forecasts (1st pass): determine unique forecast and ahead times
    for (i = 0; i < forecasts.length; ++i) {
      forecastTime = forecasts[i].forecast_time;
      queryTime = forecasts[i].query_time;
            
      aheadTime = ((new Date(forecastTime)).getTime() - (new Date(queryTime)).getTime());
      aheadTime /= (1000 * 60 * 60); // Convert ms to hrs
      
      uniqueAheadTimes[aheadTime] = true;
      uniqueForecastTimes[forecastTime] = true;
    }
    
    // Add 0 ahead time for observations
    uniqueAheadTimes[0] = true;
    
    // Sort unique forecast and ahead times, and assign to results
    results.forecastTimes = Object.keys(uniqueForecastTimes).sort();
    results.aheadTimes = Object.keys(uniqueAheadTimes).sort(function numericalSortAscending (a, b) {
      return a - b;
    });
    
    // Build forecast and ahead time indices: allow reverse look-up
    for (i = 0; i < results.forecastTimes.length; ++i) {
      forecastTimeIndices[results.forecastTimes[i]] = i;
    }
    
    for (i = 0; i < results.aheadTimes.length; ++i) {
      aheadTimeIndices[results.aheadTimes[i]] = i;
    }
    
    // Initialise 2D forecasts array
    for (i = 0; i < results.forecastTimes.length; ++i) {
      results.forecasts[i] = [];
      
      for (j = 0; j < results.aheadTimes.length; ++ j) {
        results.forecasts[i][j] = {};
      }
    }
    
    // Forecasts (2nd pass): insert forecast into appropriate slot in 2D forecasts array
    for (i = 0; i < forecasts.length; ++i) {
      forecastTime = forecasts[i].forecast_time;
      queryTime = forecasts[i].query_time;
      
      aheadTime = ((new Date(forecastTime)).getTime() - (new Date(queryTime)).getTime());
      aheadTime /= (1000 * 60 * 60); // Convert ms to hrs
      
      forecastTimeIndex = forecastTimeIndices[forecastTime];
      aheadTimeIndex = aheadTimeIndices[aheadTime];      
      results.forecasts[forecastTimeIndex][aheadTimeIndex] = forecasts[i];
    }
    
    // Add observations at aheadTimeIndex = 0 for any forecast times that match
    for (i = 0; i < observations.length; ++i) {
      observationTime = observations[i].observation_time;
      
      if (forecastTimeIndices.hasOwnProperty(observationTime)) {
        forecastTimeIndex = forecastTimeIndices[observationTime];
        results.forecasts[forecastTimeIndex][0] = observations[i];
      }
    }
    
    return results;    
  }
  
  function create (file, callback) {
    var initSql = '';
    
    winston.info('Creating DB file: ' + file);
    sqlDb = new sqlite3.Database(file);
    
    initSql = fs.readFileSync('./init.sql', 'utf8');
    sqlDb.serialize(function () {
      sqlDb.exec(initSql);
      populateWeatherIcons(callback);
    });
  };
  
  function load (file) {
    sqlDb = new sqlite3.Database(file);
  }
  
  return {
    init: function (file, callback) {
      if (fs.existsSync(file)) {
        load(file);
        getWeatherIconIds(callback);
      } else {
        create(file, function () {
          getWeatherIconIds(callback);
        });
      }
    },
    
    getLocationId: function (location, callback) {
      // Find locations's row in locations table
      sqlDb.get('SELECT * FROM locations WHERE lat = ? AND long = ?', location.lat, location.long, function (err, row) {
        // Doesn't exist, so add
        if (row === undefined) {
          winston.info('Adding location: ' + location.name);
          // Ensure location is inserted before determining new row's ID
          async.series({
            // Insert new row into locations table
            insertLocation: function (callback) {
            sqlDb.get('INSERT INTO locations (name, lat, long) VALUES (?, ?, ?)',
              location.name, location.lat, location.long,
              function (err, row) { 
                callback(err);
              }
            );              
            },
            // Determine ID for new row
            getRowId: function (callback) {
              sqlDb.get('SELECT last_insert_rowid() as id', function (err, row) {               
                callback(err, row.id);
              });             
            }
          },
          function (err, results) {
            callback(null, results.getRowId);
          });
        }
        // Already exists, so update locations's ID
        else
        {
          callback(null, row.id);
        }
      });
    },
    
    getServiceId: function (service, callback) {
      // Find service's row in services table
      sqlDb.get('SELECT * FROM services WHERE name = ?', service.name, function (err, row) {
        // Doesn't exist, so add
        if (row === undefined) {
          winston.info('Adding service: ' + service.name);
          
          // Ensure service is inserted before determining new row's ID
          async.series({
            // Insert new row into services table
            insertService: function (callback) {
              sqlDb.run('INSERT INTO services (name, desc, query_freq_hrs, forecast_freq_hrs, forecast_ahead_hrs) VALUES (?, ?, ?, ?, ?)',
                service.name, service.desc, service.queryForecastFreqHrs, service.forecastFreqHrs, service.forecastAheadHrs,
                function (err, row) {
                  callback(err);
                }
              );
            },
            // Determine ID for new row
            getRowId: function (callback) {
              sqlDb.get('SELECT last_insert_rowid() as id', function (err, row) {
                callback(err, row.id);
              });
            }
          },
          function (err, results) {
            callback(null, results.getRowId, false);
          });
        }
        // Already exists, so update service's ID
        else
        {
          callback(null, row.id, true);
        }
      });
    },
    
    insertServiceWeatherCodes: function (service, callback) {
      var weatherCodes = service.getWeatherCodes();
      var statement = sqlDb.prepare('INSERT INTO service_weather_codes (service_id, weather_code, weather_icon_id) VALUES (?, ?, ?)');
      var weatherCode;
      for (weatherCode in weatherCodes) {
        statement.run(service.id, weatherCode, wi.getIconId(weatherCodes[weatherCode].weatherIcon));
      }
      statement.finalize(function (err) { callback(err); });
    },
    
    getServices: function (callback) {
      sqlDb.all('SELECT id, desc FROM services', function (err, rows) {
        callback(err, rows);
      });
    },
    
    getForecasts: function (serviceId, locationId, startTime, endTime, callback) {
      /*
      // SELECT weather_icon_id FROM service_weather_codes WHERE service_weather_codes.service_id = forecasts.service_id AND service_weather_codes.weather_code = forecasts.weather_code
      var weatherIconIdForService = service_weather_codes
        .select(service_weather_codes.weather_icon_id)
        .from(service_weather_codes)
        .where(
          service_weather_codes.service_id.equals(forecasts.service_id)
          .and(service_weather_codes.weather_code.equals(forecasts.weather_code))
        );
      winston.info(weatherIconIdForService.toQuery().text);
      
      // SELECT name FROM weather_icons WHERE id = (weatherIconIdForService)
      var weatherIconNameForId = weather_icons
        .select(weather_icons.name)
        .from(weather_icons)
        .where(weather_icons.id.equals(weatherIconIdForService));
      winston.info(weatherIconNameForId.toQuery().text);
      
      // SELECT query_time, forecast_time, (weatherIconNameForId) AS weather_icon_name, temp, wind_speed, wind_dir FROM forecasts WHERE service_id = ? AND location_id = ? AND forecast_time BETWEEN ? AND ?
      var forecastsWithWeatherIcon = forecasts
        .select(forecasts.query_time, forecasts.forecast_time, weatherIconNameForId, forecasts.temp, forecasts.wind_speed, forecasts.wind_dir)
        .where(
            forecasts.service_id.equals(serviceId)
            .and(forecasts.location_id.equals(locationId))
            .and(forecasts.forecast_time.between(startTime).and(endTime))
        );
      winston.info(forecastsWithWeatherIcon.toQuery().text);
      
      sqlDb.all(forecastsWithWeatherIcon.toQuery().text, function (err, rows) {
        callback(err, rows);
      });
      */
      
      sqlDb.serialize(function () {
        var service, location;
        var observations = [], forecasts = [];
        
        sqlDb.get('SELECT desc, forecast_freq_hrs FROM services WHERE id = ?', serviceId, function (err, row) {
          service = row;
        });
        
        sqlDb.get('SELECT name, lat, long FROM locations WHERE id = ?', locationId, function (err, row) {
          location = row;
        });
        
        sqlDb.all('SELECT query_time, observation_time, (SELECT name FROM weather_icons WHERE id = (SELECT weather_icon_id FROM service_weather_codes WHERE service_weather_codes.service_id = observations.service_id AND service_weather_codes.weather_code = observations.weather_code)) AS weather_icon_name, temp, wind_speed, wind_dir FROM observations WHERE service_id = ? AND location_id = ? AND observation_time BETWEEN ? AND ?',
          serviceId, locationId, startTime, endTime,
          function (err, rows) {
            observations = rows;
          }
        );

        sqlDb.all('SELECT query_time, forecast_time, (SELECT name FROM weather_icons WHERE id = (SELECT weather_icon_id FROM service_weather_codes WHERE service_weather_codes.service_id = forecasts.service_id AND service_weather_codes.weather_code = forecasts.weather_code)) AS weather_icon_name, temp, wind_speed, wind_dir FROM forecasts WHERE service_id = ? AND location_id = ? AND forecast_time BETWEEN ? AND ?',
          serviceId, locationId, startTime, endTime,
          function (err, rows) {
            forecasts = rows;
            callback(err, generateResults(service, location, observations, forecasts));
          }
        );
      });      
    },
    
    addForecasts: function (locationId, serviceId, forecasts) {
      var statement = sqlDb.prepare('INSERT INTO forecasts (location_id, service_id, query_time, forecast_time, weather_code, temp, wind_speed, wind_dir) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      var i, fc;
      
      for (i = 0; i < forecasts.length; ++i) {
        fc = forecasts[i];
        if (new Date(fc.queryTime) < new Date(fc.forecastTime)) {
          statement.run(locationId, serviceId, fc.queryTime, fc.forecastTime, fc.weatherCode, fc.temp, fc.windSpeed, fc.windDir);
        }
      }
      
      statement.finalize();   
    },
    
    // Ensure that only new observations are written to the database
    addObservations: function (locationId, serviceId, observations) {
      var lastObservationTime; 
      
      async.series([
        function(callback) {
          // Determine most recent observation time
          sqlDb.get('SELECT MAX(observation_time) AS last_observation_time FROM observations WHERE location_id = ? AND service_id = ?',
            locationId, serviceId,
            function (err, row) {
              lastObservationTime = row.last_observation_time;
              callback(err);
          });
        },
        
        function(callback) {        
          var statement = sqlDb.prepare('INSERT INTO observations (location_id, service_id, query_time, observation_time, weather_code, temp, wind_speed, wind_dir) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
          var i, ob;
          
          for (i = 0; i < observations.length; ++i) {
            ob = observations[i];
            
            // Do not add duplicate observations
            if (new Date(ob.observationTime) > new Date(lastObservationTime)) {
              statement.run(locationId, serviceId, ob.queryTime, ob.observationTime, ob.weatherCode, ob.temp, ob.windSpeed, ob.windDir);
            }
          }
          
          statement.finalize(function() { callback(); });
        }
      ]);
    }
  };
}());

module.exports = db;