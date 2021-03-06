var wtw = (function () {
	var async = require("async");
	var winston = require("winston");
	var config = require("./config");
	var db = require("./db");
	var server = require("./server");
	
	var locations = [];
	var services = [];
	
	function configureLogging () {
	  var loggingOptions = { filename: config.logFile };
	  
	  // "info" is default log level in winston
	  if (config.verboseLogging) {
	    loggingOptions.level = "verbose";
    }
	  
	  winston.add(winston.transports.File, loggingOptions);
	};
	
	function loadLocations(callback) {		
		async.each(config.locations, function (location, callback) {
			// Add location to DB if non-existent; update location ID
			db.getLocationId(location, function (err, id) {
				location.id = id;
				locations.push(location);
				callback(err);
			});
		}, function (err) {
			callback(err);
		});
	};
	
	function loadServices (callback) {
		async.each(config.services, function (configService, callback) {					
			// Load module for each service in config
			var service = require("./services/" + configService.name);
			var isNewService = false;
			
			async.series([
			    function (callback) {
			    	// Add service to DB if non-existent; update service ID
					db.getServiceId(service, function (err, id, serviceExisted) {
						service.id = id;
						isNewService = !serviceExisted;
						callback();
					});
			    },
			    function (callback) {
			    	if (isNewService) {
				    	db.insertServiceWeatherCodes(service, function (err) {
							callback(err);
						});
			    	} else {
			    		callback(null);
			    	}
			    }
			],
			function (err) {
				// Start service
				winston.info("Starting service: %s", service.name);
				service.start(locations, db.addForecasts, db.addObservations);
				services.push(service);
				callback(err);
			});
		}, function (err) {
			callback(err);
		});
	};
	
	return {
		init: function () {
		  configureLogging();
			async.series([
			    function (callback) {
			    	db.init(config.dbFile, function () { callback(); });
			    },
			    function (callback) {
			    	loadLocations(function () { callback(); });
			    },
			    function (callback) {
			    	loadServices(function () { callback(); });			    	
			    }
			],
			function () {
				server.init(db);
			});
		},
		
		getServices: function () {
			return services;
		}
	};
}());

module.exports = wtw;
wtw.init();