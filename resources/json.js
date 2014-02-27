var json = (function () {
	var db = null;
	
	return {
		init: function (initDb) {
			db = initDb;
		},
		
		getServices: function (req, res) {			
			db.getServices(function (err, services) {
				res.send(JSON.stringify(services));
			});
		},
		
		getForecasts: function (req, res) {
			if (req.query.serviceId && req.query.locationId && req.query.start && req.query.end) { 
				db.getForecasts(req.query.serviceId, req.query.locationId, req.query.start, req.query.end, function (err, forecasts) {
					res.send(JSON.stringify(forecasts, null, "\t"));
				});
			}
			else
			{
				res.status(404).send("Invalid query. Query must contain values: 'locationId', 'serviceId', 'start', 'end'.");
			}
		}
	};
}());

module.exports = json;