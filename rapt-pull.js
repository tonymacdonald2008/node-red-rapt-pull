module.exports = function(RED) {
    "use strict";
    var request = require('request');

    function RaptCredentialsNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        node.token ="";
        node.token_expiry=Date.now();
    }
    RED.nodes.registerType("rapt-credentials",RaptCredentialsNode, {
        credentials: {
            user_name: {type:"text"},
            api_secret: {type:"password"}
        }
    });

    RaptCredentialsNode.prototype.get = function(url,opts) {
        var node = this;
        opts = opts || {};
        var authheader = {"Authorization": "Bearer " + node.token};
        return new Promise(function(resolve,reject) {
            request.get({
                url: url,
                headers: authheader,
                json: true,
                qs: opts
            }, function(err, response,body) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        status: response.statusCode,
                        rateLimitRemaining: response.headers['x-rate-limit-remaining'],
                        rateLimitTimeout: 5000+parseInt(response.headers['x-rate-limit-reset'])*1000 - Date.now(),
                        body: body
                    });
                }
            });
        })
    }
    RaptCredentialsNode.prototype.post = function(url,data,opts,form) {
        var node = this;
        opts = opts || {};
        var headers = { 'Content-Type': "application/x-www-form-urlencoded", Accept: "*/*", Connection: "keep-alive" };

        var options = {
            url: url,
            followAllRedirects: true,
            headers: headers
        };
        if (data) {
            options.body = data;
        }
        if (form) {
            options.form = form;
        }
        return new Promise(function(resolve,reject) {
            request.post(options, function(err, response,body) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        status: response.statusCode,
                        body: body
                    });
                }
            });
        })
    }

    RaptCredentialsNode.prototype.authorise = function() {
        var node = this;
        
        if (node?.token){
            var token = node.token;
            const token_expired = (token) => (Date.now() >= JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()).exp * 1000);
            if (!token_expired){
                 return new Promise((resolve) => token);
            }
        }
        let credentials = node.credentials;
        let url = "https://id.rapt.io/connect/token";
        var parms = { password: credentials.api_secret, username: credentials.user_name, client_id: "rapt-user", grant_type: "password" };
        return this.post(url,null,null,parms).then(function(result) {
            var res = result.body;
            var resobject = JSON.parse(res);
            if (resobject?.access_token) {
                node.token = resobject.access_token;
                return node.token;
            } else {
                throw new Error("failed to get a token: " + res);
            }

        }).catch(function(err) {
            node.error(err);
        })
    }

    function RaptPullNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        var nodeContext = this.context();

        node.account = config.account;
        node.name = config.name;
        node.endpoint = config.endpoint;
        node.topic = config.topic;
        node.split = config.split;
        node.raptConfig = RED.nodes.getNode(node.account);
        
        var opts = {};

        node.on('input', function(msg) {
            let endpoint = node.endpoint;
            let topic = node.topic || endpoint;
            let split = node.split;

            
            let payload = msg.payload;
            if (!Array.isArray(payload)){
                payload = [payload];
            }
            payload.forEach(function (element) {
                opts = {};
                switch (endpoint.toLowerCase()){
                    case 'gettelemetry':
                        opts.hydrometerId = element.id;
                        if (undefined == opts.hydrometerId){ 
                            node.error("no hydrometerId found");
                            return null;
                        }
                        // keep track of last time we requested telemetry for each hydrometer
                        let lasttelemetryobj = nodeContext.get('lastTelemetry')||{};
                        let lasttelemetry = lasttelemetryobj?.[opts.hydrometerId];
                        let start = msg?.start || lasttelemetry || Date.now();
                        let startDate = new Date(start);
                        let end = msg?.end || Date.now();
                        let endDate = new Date(end);
                        opts.startDate = startDate.toISOString();
                        opts.endDate = endDate.toISOString();
                        lasttelemetryobj[opts.hydrometerId] = endDate.getTime();
                        nodeContext.set('lastTelemetry',lasttelemetryobj);
                    case 'gethydrometer':
                        opts.hydrometerId = element.id;
                        if (undefined == opts.hydrometerId){ 
                            node.error("no hydrometerId found");
                            return null;
                        }
                        break;
                    case 'gethydrometers':
                        /* no parms for this one*/
                        break;
                    default:
                    /* unsupported endpoint */
                    throw new Error("unsupported endpoint: " + endpoint);
                }

                node.raptConfig.authorise()
                .then(() =>node.getEndpoint(endpoint,opts))
                .then((result) => {
                    if(Array.isArray(result)&&split){
                        result.forEach(function (element) {
                            const newmsg = {};
                            newmsg.topic = topic;
                            newmsg.payload = element;
                            node.send(newmsg);
                        });
                    } else {
                        const newmsg = {};
                        newmsg.topic = topic;
                        newmsg.payload = result;
                        node.send(newmsg);
                    }
                    return null;
                });
            });

        });
    }
    
    RED.nodes.registerType("rapt-pull",RaptPullNode);
    

    RaptPullNode.prototype.getEndpoint = function(endpointurl, opts) {
        var node = this;
        let url = "https://api.rapt.io/api/Hydrometers/"+endpointurl;
        
        return node.raptConfig.get(url,opts).then(function(result) {
            var res = result.body;
            return res;
        }).catch(function(err) {
            node.error(err);
        })
    }
    
}
