var wtw = (function () {
	var fs = require("fs");
	var config = require("./config");
	var db = require("./db");
	
	var locations = [];
	var services = [];
	
	return {
		init: function () {
			db.init(config.dbFile);
		}
	};
}());

wtw.init();