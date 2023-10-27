module.exports = function(RED) {
    "use strict";
    var request = require('request');

    function RaptCredentialsNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        node.on('input', function(msg) {
            msg.orig_payload = msg.payload;
            msg.payload = msg.payload.toLowerCase();
            node.send(msg);
        });
    }
    RED.nodes.registerType("rapt-credentials",RaptCredentialsNode, {
        credentials: {
            user_name: {type:"password"},
            api_secret: {type:"password"},
            access_token: {type:"password"}
        }
    });

    function RaptPullNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        this.rapt = config.rapt;
        var credentials = RED.nodes.getCredentials(this.rapt);
        node.on('input', function(msg) {
            msg.orig_payload = msg.payload;
            msg.payload = msg.payload.toLowerCase();
            msg.secret = credentials;
            msg.rapt = this.rapt;
            msg.config = config;
            node.send(msg);
        });
    }
    RED.nodes.registerType("rapt-pull",RaptPullNode);
}
