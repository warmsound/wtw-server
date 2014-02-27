CREATE TABLE [forecasts] (
  [id] INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, 
  [location_id] INTEGER NOT NULL CONSTRAINT [location_id] REFERENCES [locations]([id]), 
  [service_id] INTEGER NOT NULL CONSTRAINT [service_id] REFERENCES [services]([id]), 
  [query_time] TEXT(19) NOT NULL, 
  [forecast_time] TEXT(19) NOT NULL, 
  [weather_code] INTEGER NOT NULL CONSTRAINT [weather_code_id] REFERENCES [service_weather_codes]([id]), 
  [temp] INTEGER, 
  [temp_hi] INTEGER, 
  [temp_lo] INTEGER, 
  [wind_speed] INTEGER, 
  [wind_dir] CHAR(3));

CREATE INDEX [forecast] ON [forecasts] ([location_id], [service_id], [query_time], [forecast_time]);


CREATE TABLE [locations] (
  [id] INTEGER NOT NULL PRIMARY KEY, 
  [name] TEXT(100) NOT NULL, 
  [lat] REAL(9, 6) NOT NULL, 
  [long] REAL(9, 6) NOT NULL);

CREATE UNIQUE INDEX [lat_long] ON [locations] ([lat], [long]);


CREATE TABLE [services] (
  [id] INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, 
  [name] TEXT(10) NOT NULL, 
  [desc] TEXT(100), 
  [query_freq_hrs] INTEGER NOT NULL DEFAULT 24, 
  [forecast_freq_hrs] INTEGER NOT NULL DEFAULT 24, 
  [forecast_ahead_hrs] INTEGER NOT NULL DEFAULT 72);

CREATE UNIQUE INDEX [name] ON [services] ([name]);


CREATE TABLE [service_weather_codes] (
  [id] INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, 
  [service_id] INTEGER NOT NULL CONSTRAINT [service_id] REFERENCES [services]([id]), 
  [weather_code] INTEGER NOT NULL, 
  [weather_icon_id] INTEGER NOT NULL CONSTRAINT [weather_icon_id] REFERENCES [weather_icons]([id]));

CREATE UNIQUE INDEX [code] ON [service_weather_codes] ([weather_code]);


CREATE TABLE "weather_icons" (
  [id] INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, 
  [name] CHAR NOT NULL);


