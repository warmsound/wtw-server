var met = (function () {
	var config = require("../config");
	var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
	
	var name = "met";
	var desc = "MET Office DataPoint API";
	var queryFreqHrs = 1;
	var forecastFreqHrs = 3;
	var forecastAheadHrs = 72;
	
	var url = "http://datapoint.metoffice.gov.uk/public/data/val/wxfcs/all/json/3672?res=3hourly&key=";
	var apiKey = "c5ff98ca-c067-4506-b77e-ed968997548a";
	var firstIntervalObject = null;
	var intervalObject = null;
	var forecastCallback = null;
	var service = null;	
	
	function getQueryUrl () {
		return url + apiKey;
	};
	
	// If it's 3.33pm now, return the number of milliseconds until 6pm,
	// assuming we're querying every 3 hours. Add a small delay to avoid
	// sending query when every other application is sending a query!
	function getFirstIntervalDelay () {
		var now = Date.now();
		var queryInterval = queryFreqHrs * 60 * 60 * 1000;
		var sinceLastInterval = now % queryInterval;
		return (queryInterval - sinceLastInterval + (config.queryDelaySecs * 1000));		
	};
	
	// Query time set to last time data was updated, rather than
	// time when query was made
	function getQueryTime (dataDate) {
		var queryTime = new Date(dataDate);
		return queryTime.toJSON();
	}
	
	// Work backwards from end of day to determine forecast time
	// e.g. if there are 5 intervals, and the forecast frequency is 3 hours,
	// then the 5 intervals must correspond to 9am, 12pm, 3pm, 6pm and 9pm.
	function getForecastTime (date, interval, intervalCount) {
		var forecastTime = new Date(date);
		forecastTime.setHours(forecastTime.getHours() + 24 - ((intervalCount - interval) * forecastFreqHrs));
		return forecastTime.toJSON();
	}
	
	function doQuery (location) {
		var xhr = new XMLHttpRequest;
		xhr.open("GET", getQueryUrl());
		xhr.onload = function () {
			parseQueryResult(location, this.responseText);
		};
		xhr.send();
	};
	
	function parseQueryResult (location, result) {
		var res = JSON.parse(result);		
		var day, days = res.SiteRep.DV.Location.Period;
		var interval, intervals;
		var forecast;
		
		for (day = 0; day < days.length; ++day) {
			intervals = days[day].Rep;
			for (interval = 0; interval < intervals.length; ++interval) {
				forecast = {
					locationId: location.id,
					serviceId: service.id,
					queryTime: getQueryTime(res.SiteRep.DV.dataDate),
					forecastTime: getForecastTime(days[day].value, interval, intervals.length),
					weatherCodeId: parseInt(intervals[interval].W),
					temp: parseInt(intervals[interval].T)
				};
				forecastCallback(forecast);
			}
		}		
	};
	
	return {
		id: 0, // Read from DB
		name: name,
		desc: desc,
		url: url,
		apiKey: apiKey,		
		queryFreqHrs: queryFreqHrs,
		forecastFreqHrs: forecastFreqHrs,
		forecastAheadHrs: forecastAheadHrs,
		
		start: function (locations, addForecastCallback) {
			forecastCallback = addForecastCallback;
			service = this;
			
			// TODO: Query site list
			
			function queryLocations () {
				var i;
				for (i = 0; i < locations.length; ++i) {
					doQuery(locations[i]);
				}
			};
			
			// Query immediately, then on every interval
			queryLocations(); // Immediate
			firstIntervalDelay = new Date;
			firstIntervalObject = setTimeout(function () {
				queryLocations(); // First interval
				intervalObject = setInterval(queryLocations, queryFreqHrs * 60 * 60 * 1000); // Subsequent intervals
			}, getFirstIntervalDelay());						
		},
		
		stop: function () {
			if (firstIntervalObject) {
				clearInterval(firstIntervalObject);
				
				if (intervalObject) {
					clearInterval(intervalObject);
				}				
			}			
		}
	};	
}());

module.exports = met;