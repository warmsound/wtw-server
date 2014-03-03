var server = (function () {
	var express = require("express");
	var config = require("./config");
	var json = require("./resources/json");
	var app = null;
	
	function onGetData(req, res) {
		var resource = null;
		
		switch (req.params.format) {
		case "json":
			resource = json;
			break;
		
		case "xml":
		default:
			res.status(404).send("Invalid format. Valid values are: 'json'.");
			break;
		}
		
		switch (req.params.resource) {
		case "services":
			resource.getServices(req, res);
			break;
			
		case "forecasts":
			resource.getForecasts(req, res);
			break;
			
		default:
			res.status(404).send("Invalid resource. Valid values are: 'services', 'forecasts'.");
			break;
		}
		
	// Allow cross-origin access to API (jQuery uses OPTIONS, other frameworks may simply use GET)
		res.header("Access-Control-Allow-Origin", "*");
	};
	
	return {
		init: function (db) {
			app = express();
			
			// Set up resources
			json.init(db);
			
			// Set up routes
			app.get("/wtw/data/:format/:resource", onGetData);
			app.get("*", function (req, res) {
				res.status(404).send("Invalid request. Valid requests are in the form: '/wtw/data/&lt;format&gt;/&lt;resource&gt;'");
			});
			// Allow cross-origin access to API (jQuery uses OPTIONS, other frameworks may simply use GET)
			app.options("*", function(req, res){
			  res.header("Access-Control-Allow-Origin", "*");
			  res.end("");
			});
			
			console.log("Starting server on port: " + config.port);
			app.listen(config.port);
		}
	};
}());

module.exports = server;