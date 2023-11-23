# node-red-rapt-pull
Simple node to pull data from RAPT cloud for integration into node red flows.

RAPT Pill is a floating digital hydrometer and thermometer produced by KegLand.
It pushes its telemetry data to the RAPT cloud via wifi or indirectly via blue-tooth through a compatible KegLand device.

This node-red integration project uses the RAPT API v1 to request device or telemetry information from the RAPT cloud so that it can be integrated into a Node-RED flow.

Currently the following API endpoints are supported 

```
/api​/Hydrometers​/GetHydrometers
/api​/Hydrometers​/GetHydrometer
/api​/Hydrometers​/GetTelemetry
```
Each instance of the rapt-pull node is configured to invoke one of the supported endpoints.

When configured for GetHydrometers, it will return an array objects contantaining details for all hydrometers configured against your RAPT account.  
When configured for GetHydrometer, it will return an object containing details about a single hydrometer.  
When configured for GetTelemetry, it will return an array of objects containing telemetry information for a specific time period.  

By chaining node instances together it is very easy to create a flows to get exactly the information you would like.

For expample, to get all new telemetry information hourly, you could wire an inject node set to repeat every hour into a rapt-pull node configured for GetHydrometers and wire its output to another rapt pull node configured for GetTelemetry as shown in the example below. In this configuration, the node configured for GetTelemetry will retreive the Telemetry data for the period since it was last invoked.
