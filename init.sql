CREATE TABLE [forecasts] (
  [id] INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, 
  [location_id] INTEGER NOT NULL CONSTRAINT [location_id] REFERENCES [locations]([id]), 
  [service_id] INTEGER NOT NULL CONSTRAINT [service_id] REFERENCES [services]([id]), 
  [query_time] DATETIME NOT NULL, 
  [forecast_time] DATETIME NOT NULL, 
  [weather_code_id] INTEGER NOT NULL CONSTRAINT [weather_code_id] REFERENCES [weather_codes]([id]), 
  [temperature] INTEGER, 
  [temperature_high] INTEGER, 
  [temperature_low] INTEGER);

CREATE INDEX [forecast] ON [forecasts] ([location_id], [service_id], [query_time], [forecast_time]);


CREATE TABLE [locations] (
  [id] INTEGER NOT NULL PRIMARY KEY, 
  [name] CHAR(100) NOT NULL, 
  [lat] DECIMAL(9, 6) NOT NULL, 
  [long] DECIMAL(9, 6) NOT NULL);

CREATE UNIQUE INDEX [lat_long] ON [locations] ([lat], [long]);


CREATE TABLE [services] (
  [id] INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, 
  [name] CHAR(100) NOT NULL, 
  [url] CHAR(100) NOT NULL, 
  [api_key] CHAR(50), 
  [query_frequency_hours] INTEGER NOT NULL DEFAULT 24, 
  [forecast_frequency_hours] INTEGER NOT NULL DEFAULT 24, 
  [forecast_ahead_hours] INTEGER NOT NULL DEFAULT 72);


CREATE TABLE [weather_codes] (
  [id] INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, 
  [service_id] INT NOT NULL CONSTRAINT [service_id] REFERENCES [services]([id]), 
  [code] INT NOT NULL, 
  [description] CHAR(50) NOT NULL, 
  [img_url] CHAR(100));

CREATE UNIQUE INDEX [code] ON [weather_codes] ([code]);


