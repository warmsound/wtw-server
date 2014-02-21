var config = {
	dbFile: "wtw.db",
	services: [
	    { name: "met" }
	    ],
	locations: [
	    { name: "Welwyn Garden City", lat: 51.8, long: -0.19 }
	    ],
	queryDelaySecs: 180
};

module.exports = config;