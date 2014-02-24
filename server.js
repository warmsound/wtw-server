var server = (function () {
	var express = require("express");
	var config = require("./config");
	var json = require("./resources/json");
	var app = null;
	
	function onGetData(req, res) {
		switch (req.params.format) {
		case "json":
			json.onGetData(req, res);
			break;
			
		case "xml":
		default:
			res.status(404).send("Invalid format. Valid values are: 'json'.");
			break;
		}
	};
	
	return {
		init: function () {
			app = express();
			
			// Set up resources
			json.init(require("./main"));
			
			// Set up routes
			app.get("/wtw/data/:format/:resource", onGetData);
			app.get("/", function (req, res) {
				res.status(404).send("Invalid request. Valid requests are in the form /wtw/data/[format]/[service].");
			});
			
			app.listen(config.port);
		}
	};
}());

module.exports = server;