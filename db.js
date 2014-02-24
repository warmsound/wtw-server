var db = (function() {
	var fs = require("fs");
	var async = require("async");
	var sqlite3 = require("sqlite3").verbose();
	var sqlDb = null;
	
	function create (file) {
		var initSql = "";
		
		console.log("Creating DB file: " + file);
		sqlDb = new sqlite3.Database(file);
		
		initSql = fs.readFileSync("./init.sql", "utf8");
		sqlDb.serialize(function () {
			sqlDb.exec(initSql);
		});
	};
	
	function load (file) {
		sqlDb = new sqlite3.Database(file);
	}
	
	return {
		init: function (file) {
			if (fs.existsSync(file)) {
				load(file);
			} else {
				create(file);
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
						callback(null, results.getRowId);
					});
				}
				// Already exists, so update service's ID
				else
				{
					callback(null, row.id);
				}
			});
		},
		
		addForecast: function (forecast) {
			sqlDb.run("INSERT INTO forecasts (location_id, service_id, query_time, forecast_time, weather_code_id, temp) VALUES (?, ?, ?, ?, ?, ?)",
				forecast.locationId, forecast.serviceId, forecast.queryTime, forecast.forecastTime, forecast.weatherCodeId, forecast.temp);
		}
	};
}());

module.exports = db;