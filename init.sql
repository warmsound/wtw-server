CREATE TABLE [forecasts] (
  [id] INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, 
  [location_id] INTEGER NOT NULL CONSTRAINT [location_id] REFERENCES [locations]([id]), 
  [service_id] INTEGER NOT NULL CONSTRAINT [service_id] REFERENCES [services]([id]), 
  [query_time] TEXT(19) NOT NULL, 
  [forecast_time] TEXT(19) NOT NULL, 
  [weather_code_id] INTEGER NOT NULL CONSTRAINT [weather_code_id] REFERENCES [weather_codes]([id]), 
  [temp] INTEGER, 
  [temp_hi] INTEGER, 
  [temp_lo] INTEGER);

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


CREATE TABLE [weather_codes] (
  [id] INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, 
  [service_id] INTEGER NOT NULL CONSTRAINT [service_id] REFERENCES [services]([id]), 
  [code] INTEGER NOT NULL, 
  [desc] TEXT(50) NOT NULL, 
  [img_url] TEXT(100));

CREATE UNIQUE INDEX [code] ON [weather_codes] ([code]);


