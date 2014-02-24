var json = (function () {
	var wtw = null;
	
	function onGetServices (req, res) {
		var services = wtw.getServices();
		var i;
		var response = [];
		for (i = 0; i < services.length; ++i) {
			response.push(services[i].name);
		}
		res.send(JSON.stringify(response));
	};
	
	return {
		init: function (initWtw) {
			wtw = initWtw;
		},
		
		onGetData: function (req, res) {
			switch (req.params.resource) {
			case "services":
				onGetServices(req, res);
				break;
				
			case "forecasts":
			default:
				// TODO
				break;
			}
		}
	};
}());

module.exports = json;