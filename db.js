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
		
		addLocation: function (location) {
			// TODO
		},
		
		addService: function (service) {
			// TODO
		},
		
		addForecast: function (forecast) {
			// TODO
		},
		
		getLocations: function() {
			return [];
		},
		
		getServices: function() {
			return [];
		}
	};
}());

module.exports = db;