var db = (function() {
	var fs = require("fs");
	var async = require("async");
	var sqlite3 = require("sqlite3").verbose();
	var sqlDb = null;
	var wi = require("./weather-icons");
	
	function getWeatherIconIds (callback) {
		var weatherIconIds = {};
		console.log("Reading weather icon IDs");
		sqlDb.each("SELECT * from weather_icons",
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
		console.log("Populating weather icons");
		
		var icons = wi.getIconNames();
		var statement = sqlDb.prepare("INSERT INTO weather_icons (name) VALUES (?)");
		var i;
		for (i = 0; i < icons.length; ++i) {
			statement.run(icons[i]);
		}
		statement.finalize(function (err) { callback(err); });
	};
	
	function create (file, callback) {
		var initSql = "";
		
		console.log("Creating DB file: " + file);
		sqlDb = new sqlite3.Database(file);
		
		initSql = fs.readFileSync("./init.sql", "utf8");
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
			sqlDb.get("SELECT * FROM locations WHERE lat = ? AND long = ?", location.lat, location.long, function (err, row) {
				// Doesn't exist, so add
				if (row === undefined) {
					console.log("Adding location: " + location.name);
					// Ensure location is inserted before determining new row's ID
					async.series({
					    // Insert new row into locations table
					    insertLocation: function (callback) {
							sqlDb.get("INSERT INTO locations (name, lat, long) VALUES (?, ?, ?)",
								location.name, location.lat, location.long,
								function (err, row) {
									callback(err);
								}
							);							
					    },
					    // Determine ID for new row
					    getRowId: function (callback) {
					    	sqlDb.get("SELECT last_insert_rowid() as id", function (err, row) {								
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
			sqlDb.get("SELECT * FROM services WHERE name = ?", service.name, function (err, row) {
				// Doesn't exist, so add
				if (row === undefined) {
					console.log("Adding service: " + service.name);
					
					// Ensure service is inserted before determining new row's ID
					async.series({
						// Insert new row into services table
						insertService: function (callback) {
							sqlDb.run("INSERT INTO services (name, desc, query_freq_hrs, forecast_freq_hrs, forecast_ahead_hrs) VALUES (?, ?, ?, ?, ?)",
							    service.name, service.desc, service.queryFreqHrs, service.forecastFreqHrs, service.forecastAheadHrs,
							    function (err, row) {
									callback(err);
								}
							);
						},
						// Determine ID for new row
						getRowId: function (callback) {
							sqlDb.get("SELECT last_insert_rowid() as id", function (err, row) {
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
			var statement = sqlDb.prepare("INSERT INTO service_weather_codes (service_id, weather_code, weather_icon_id) VALUES (?, ?, ?)");
			var weatherCode;
			for (weatherCode in weatherCodes) {
				statement.run(service.id, weatherCode, wi.getIconId(weatherCodes[weatherCode].weatherIcon));
			}
			statement.finalize(function (err) { callback(err); });
		},
		
		getServices: function (callback) {
			sqlDb.all("SELECT id, desc FROM services", function (err, rows) {
				callback(err, rows);
			});
		},
		
		getForecasts: function (serviceId, locationId, startTime, endTime, callback) {
			sqlDb.all("SELECT query_time, forecast_time, (SELECT name FROM weather_icons WHERE id = (SELECT weather_icon_id FROM service_weather_codes WHERE service_weather_codes.service_id = forecasts.service_id AND service_weather_codes.weather_code = forecasts.weather_code)) AS weather_icon_name, temp, wind_speed, wind_dir FROM forecasts WHERE service_id = ? AND location_id = ? AND forecast_time BETWEEN ? AND ?",
				serviceId, locationId, startTime, endTime,
				function (err, rows) {
					callback(err, rows);
				}
			);			
		},
		
		addForecast: function (forecast) {
			sqlDb.run("INSERT INTO forecasts (location_id, service_id, query_time, forecast_time, weather_code, temp, wind_speed, wind_dir) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
				forecast.locationId, forecast.serviceId, forecast.queryTime, forecast.forecastTime, forecast.weatherCode, forecast.temp, forecast.windSpeed, forecast.windDir);
		}
	};
}());

module.exports = db;