var met = (function () {
	var config = require("../config");
	var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
	
	var name = "met";
	var desc = "MET Office DataPoint API";
	var queryFreqHrs = 1;
	var forecastFreqHrs = 3;
	var forecastAheadHrs = 72;
	
	var weatherCodes = {
		"0": { weatherIcon: "wi-night-clear" },
		"1": { weatherIcon: "wi-day-sunny" },
		"2": { weatherIcon: "wi-night-cloudy" },
		"3": { weatherIcon: "wi-day-cloudy" },
		// "4": { weatherIcon: "not-used" },
		"5": { weatherIcon: "wi-fog" }, // Mist
		"6": { weatherIcon: "wi-fog" },
		"7": { weatherIcon: "wi-cloudy" },
		"8": { weatherIcon: "wi-cloudy" }, // Overcast
		"9": { weatherIcon: "wi-night-rain-mix" },
		"10": { weatherIcon: "wi-day-rain-mix" },
		"11": { weatherIcon: "wi-showers" },
		"12": { weatherIcon: "wi-rain-mix" },
		"13": { weatherIcon: "wi-night-rain" },
		"14": { weatherIcon: "wi-day-rain" },
		"15": { weatherIcon: "wi-rain" },
		"16": { weatherIcon: "wi-night-hail" }, // Sleet shower (night)
		"17": { weatherIcon: "wi-day-hail" }, // Sleet shower (day
		"18": { weatherIcon: "wi-hail" }, // Sleet
		"19": { weatherIcon: "wi-night-hail" },
		"20": { weatherIcon: "wi-day-hail" },
		"21": { weatherIcon: "wi-hail" },
		"22": { weatherIcon: "wi-night-snow" }, // Light snow shower (night)
		"23": { weatherIcon: "wi-day-snow" }, // Light snow shower (day)
		"24": { weatherIcon: "wi-snow" }, // Light snow
		"25": { weatherIcon: "wi-night-snow" },
		"26": { weatherIcon: "wi-day-snow" },
		"27": { weatherIcon: "wi-snow" },
		"28": { weatherIcon: "wi-night-lightning" }, // Thunder shower (night)
		"29": { weatherIcon: "wi-day-lightning" }, // Thunder shower (day)
		"30": { weatherIcon: "wi-lightning" } // Thunder
	};
	
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
	
	function getForecastTime (date, offsetMins) {
		var forecastTime = new Date(date);
		forecastTime.setMinutes(forecastTime.getMinutes() + offsetMins);
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
		var forecast, forecasts;
		var fc;
		
		for (day = 0; day < days.length; ++day) {
			forecasts = days[day].Rep;
			for (forecast = 0; forecast < forecasts.length; ++forecast) {
				fc = {
					locationId: location.id,
					serviceId: service.id,
					queryTime: getQueryTime(res.SiteRep.DV.dataDate),
					forecastTime: getForecastTime(days[day].value, forecasts[forecast].$),
					weatherCode: parseInt(forecasts[forecast].W),
					temp: parseInt(forecasts[forecast].T),
					windSpeed: forecasts[forecast].W,
					windDir: forecasts[forecast].D
				};
				forecastCallback(fc);
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
		},
		
		getWeatherCodes: function () {
			return weatherCodes;
		}
	};	
}());

module.exports = met;