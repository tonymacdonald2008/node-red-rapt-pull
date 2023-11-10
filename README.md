# node-red-rapt-integration
Simple node to pull data from RAPT cloud for integration into node red flows.

RAPT Pill is a floating digital hydrometer and thermometer produced by KegLand.
It can push its telemetry data to the RAPT cloud via wifi or indirectly via blue-tooth when paired with another KegLand device that is capable of acting as a data relay.

This node-red integration project uses the RAPT API v1 to request device or telemetry information from the RAPT cloud so that it can be integrated into a Node-RED flow.

In order to use this node you will need to have created a RAPT cloud account at https://app.rapt.io and registered a RAPT Pill device on your account.

You will need to create an API secret under your account on the RAPT cloud.
navigate to MyAccount and then to Api Secrets and then click the plus sign at the top of the screen.
this will bring up a dialog where you will need to give the secret a name .e.g "myNodeRedIntegration".
When you click save, the dialog will be updated to reveal the newly created secret and it will be copied into your clipboard.
Be sure to save this information somewhere safe as it will not be shown again. You will need to paste this
