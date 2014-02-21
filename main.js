var wtw = (function () {
	var config = require("./config");
	var db = require("./db");
	
	var locations = [];
	var services = [];
	
	function loadLocations() {
		var i, location;
		
		for (i = 0; i < config.locations.length; ++i ) {
			location = config.locations[i];
			
			// Add location to DB if non-existent; update location ID
			db.syncLocation(location);
			locations.push(location);
		}
	};
	
	function loadServices () {
		var i, service;
		
		for (i = 0; i < config.services.length; ++i ) {
			// Load module for each service in config
			service = require("./services/" + config.services[i].name);
			services.push(service);
			
			// Add service to DB if non-existent; update service ID
			db.syncService(service);		
			
			// Start service
			service.start(locations, db.addForecast);
		}		
	};
	
	return {
		init: function () {
			db.init(config.dbFile);
			loadLocations();
			loadServices();
		}
	};
}());

wtw.init();