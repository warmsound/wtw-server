var met = (function () {
	var config = require("../config");
	var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
	
	var name = "met";
	var desc = "MET Office DataPoint API";
	var queryForecastFreqHrs = 1;
	var forecastFreqHrs = 3;
	var forecastAheadHrs = 72;
	var queryObservationFreqHrs = 24;
	var observationFreqHrs = 1;
	
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
	
	var forecastUrl = "http://datapoint.metoffice.gov.uk/public/data/val/wxfcs/all/json/3672?res=3hourly&key=";
	var observationUrl = "http://datapoint.metoffice.gov.uk/public/data/val/wxobs/all/json/3672?res=hourly&key=";
	var apiKey = "c5ff98ca-c067-4506-b77e-ed968997548a";
	var firstForecastIntervalObject = null;
	var forecastIntervalObject = null;
	var observationIntervalObject = null;
	var forecastCallback = null;
	var observationCallback = null;
	var service = null;
	
	function getForecastQueryUrl () {
		return forecastUrl + apiKey;
	};
	
	function getObservationQueryUrl () {
    return observationUrl + apiKey;
  };
	
	// If it's 3.33pm now, return the number of milliseconds until 6pm,
	// assuming we're querying every 3 hours. Add a small delay to avoid
	// sending query when every other application is sending a query!
	function getFirstIntervalDelay () {
		var now = Date.now();
		var queryInterval = queryForecastFreqHrs * 60 * 60 * 1000;
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
	
	function doForecastQuery (location) {
		var xhr = new XMLHttpRequest;
		xhr.open("GET", getForecastQueryUrl());
		xhr.onload = function () {
			parseForecastQueryResult(location, this.responseText);
		};
		xhr.send();
	};
	
	function doObservationQuery (location) {
    var xhr = new XMLHttpRequest;
    xhr.open("GET", getObservationQueryUrl());
    xhr.onload = function () {
      parseObservationQueryResult(location, this.responseText);
    };
    xhr.send();
  };
	
	function parseForecastQueryResult (location, result) {
		var res = JSON.parse(result);
		try {
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
		} catch (err) {
			console.log("Error handling response from service: " + service.name);
		}				
	};
	
	function parseObservationQueryResult (location, result) {
    var res = JSON.parse(result);
    try {
      var day, days = res.SiteRep.DV.Location.Period;
      var observation, observations;
      var ob;
      
      for (day = 0; day < days.length; ++day) {
        observations = days[day].Rep;
        for (observation = 0; observation < observations.length; ++observation) {
          ob = {
            locationId: location.id,
            serviceId: service.id,
            queryTime: getQueryTime(res.SiteRep.DV.dataDate),
            observationTime: getForecastTime(days[day].value, observations[observation].$),
            weatherCode: parseInt(observations[observation].W),
            temp: parseInt(observations[observation].T),
            windSpeed: observations[observation].W,
            windDir: observations[observation].D
          };
          observationCallback(ob);
        }
      }
    } catch (err) {
      console.log("Error handling response from service: " + service.name);
    }       
  };
	
	return {
		id: 0, // Read from DB
		name: name,
		desc: desc,
		queryForecastFreqHrs: queryForecastFreqHrs,
		forecastFreqHrs: forecastFreqHrs,
		forecastAheadHrs: forecastAheadHrs,
		
		start: function (locations, addForecastCallback, addObservationCallback) {
			forecastCallback = addForecastCallback;
			observationCallback = addObservationCallback;
			service = this;
			
			// TODO: Query site list
			
			function queryForecastLocations () {
				var i;
				for (i = 0; i < locations.length; ++i) {
					doForecastQuery(locations[i]);
				}
			};
			
			function queryObservationLocations () {
        var i;
        for (i = 0; i < locations.length; ++i) {
          doObservationQuery(locations[i]);
        }
      };
			
			// Query immediately, then on every interval
			queryForecastLocations(); // Immediate
			firstForecastIntervalObject = setTimeout(function () {
				queryForecastLocations(); // First interval
				forecastIntervalObject = setInterval(queryForecastLocations, queryForecastFreqHrs * 60 * 60 * 1000); // Subsequent intervals
			}, getFirstIntervalDelay());
			
			queryObservationLocations(); // Immediate
			observationIntervalOjbect = setTimeout(function () {
			  queryObservationLocations();
			}, queryObservationFreqHrs * 60 * 60 * 1000); // Subsequent intervals
			
		},
		
		stop: function () {
			if (firstForecastIntervalObject) {
				clearInterval(firstForecastIntervalObject);
				
				if (forecastIntervalObject) {
					clearInterval(forecastIntervalObject);
				}				
			}			
		},
		
		getWeatherCodes: function () {
			return weatherCodes;
		}
	};	
}());

module.exports = met;