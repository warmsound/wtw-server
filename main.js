var wtw = (function () {
	var async = require("async");
	var config = require("./config");
	var db = require("./db");
	
	var locations = [];
	var services = [];
	
	function loadLocations(callback) {		
		async.each(config.locations, function (location, callback) {
			// Add location to DB if non-existent; update location ID
			db.getLocationId(location, function (err, id) {
				location.id = id;
				locations.push(location);
				callback();
			});
		}, function () {
			callback();
		});
	};
	
	function loadServices (callback) {
		async.each(config.services, function (configService, callback) {					
			// Load module for each service in config
			var service = require("./services/" + configService.name);
			
			// Add service to DB if non-existent; update service ID
			db.getServiceId(service, function (err, id) {
				service.id = id;
				
				// Start service
				service.start(locations, db.addForecast);
				services.push(service);
				
				callback();
			});	
		}, function () {
			callback();
		});
	};
	
	return {
		init: function () {
			db.init(config.dbFile);
			async.series([
			    function (callback) {
			    	loadLocations(function () { callback(); });
			    },
			    function (callback) {
			    	loadServices(function () { callback(); });			    	
			    }
			]);
		}
	};
}());

wtw.init();