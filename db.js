var db = (function() {
	var fs = require("fs");
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
		
		syncLocation: function (location) {
			// Find locations's row in locations table
			sqlDb.get("SELECT * FROM locations WHERE lat = ? AND long = ?", location.lat, location.long, function (err, row) {
				// Doesn't exist, so add
				if (row === undefined) {
					sqlDb.get("INSERT INTO locations (name, lat, long) VALUES (?, ?, ?)",
						location.name, location.lat, location.long);
					sqlDb.get("SELECT last_insert_rowid() as id", function (err, row) {
						location.id = row.id;
					});
				}
				// Already exists, so update locations's ID
				else
				{
					location.id = row.id;
				}
			});
		},
		
		syncService: function (service) {
			// Find service's row in services table
			sqlDb.get("SELECT * FROM services WHERE name = ?", service.name, function (err, row) {
				// Doesn't exist, so add
				if (row === undefined) {
					sqlDb.run("INSERT INTO services (name, desc, query_freq_hrs, forecast_freq_hrs, forecast_ahead_hrs) VALUES (?, ?, ?, ?, ?)",
						service.name, service.desc, service.queryFreqHrs, service.forecastFreqHrs, service.forecastAheadHrs);
					sqlDb.get("SELECT last_insert_rowid() as id", function (err, row) {
						service.id = row.id;
					});
				}
				// Already exists, so update service's ID
				else
				{
					service.id = row.id;
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