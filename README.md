# node-red-rapt-integration
Simple node to pull data from RAPT cloud for integration into node red flows.

RAPT Pill is a floating digital hydrometer and thermometer produced by KegLand.
It can push its telemetry data to the RAPT cloud via wifi or indirectly via blue-tooth when paired with another compatible KegLand device.

This node-red integration project uses the RAPT API v1 to request device or telemetry information from the RAPT cloud so that it can be integrated into a Node-RED flow.

Currently the following endpoints are supported 

```
/api​/Hydrometers​/GetHydrometers
/api​/Hydrometers​/GetHydrometer
/api​/Hydrometers​/GetTelemetry
```