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
            node.warn (token);
            node.warn (token_expired);
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
            node.warn(res);
            node.warn(resobject)
            if (resobject?.access_token) {
                node.token = resobject.access_token;
                return node.token;
            } else {
                throw new error("failed to get a token: " + res);
            }

        }).catch(function(err) {
            node.error(err);
        })
    }

    function RaptPullNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        this.rapt = config.rapt;
        this.name = config.name;
        this.endpoint = config.endpoint;
        this.raptConfig = RED.nodes.getNode(this.rapt);
        var credentials = RED.nodes.getCredentials(this.rapt);
        var opts = {};
        node.on('input', function(msg) {
            switch (this.endpoint){
                case 'GetHydrometer':
                case 'GetTelemetry':
                    opts = {hydrometerId: msg.payload[0].id};
                    break;
                default:
                opts = {};
                
            }
            this.raptConfig.authorise()
            .then(() =>this.getEndpoint(this.endpoint,opts))
            .then((result) => {
                msg.payload = result;
                node.send(msg);
            });
        });
    }
    
    RED.nodes.registerType("rapt-pull",RaptPullNode);
    
    RaptPullNode.prototype.GetHydrometers = function() {
        var node = this;

        let url = "https://api.rapt.io/api/Hydrometers/GetHydrometers";
        
        
        return node.raptConfig.get(url,null).then(function(result) {
            var res = result.body;
            node.warn(res);
            return res;
        }).catch(function(err) {
            node.error(err);
        })
    }
    
    RaptPullNode.prototype.GetHydrometer = function(hydrometerId) {
        var node = this;
        node.warn("hydrometerId provided: "+hydrometerId);

        let url = "https://api.rapt.io/api/Hydrometers/GetHydrometer";
        let opts = {hydrometerId: hydrometerId};
        
        
        return node.raptConfig.get(url,opts).then(function(result) {
            var res = result.body;
            node.warn(res);
            return res;
        }).catch(function(err) {
            node.error(err);
        })
    }
    
    RaptPullNode.prototype.GetTelemetry = function(hydrometerId) {
        var node = this;
        node.warn("hydrometerId provided: "+hydrometerId);

        let url = "https://api.rapt.io/api/Hydrometers/GetTelemetry";
        let opts = {hydrometerId: hydrometerId};
        
        
        return node.raptConfig.get(url,opts).then(function(result) {
            var res = result.body;
            node.warn(res);
            return res;
        }).catch(function(err) {
            node.error(err);
        })
    }
    
    RaptPullNode.prototype.getEndpoint = function(endpoint, opts) {
        var node = this;
        node.warn("opts provided: "+opts);

        let url = "https://api.rapt.io/api/Hydrometers/"+endpoint;
        
        return node.raptConfig.get(url,opts).then(function(result) {
            var res = result.body;
            node.warn(res);
            return res;
        }).catch(function(err) {
            node.error(err);
        })
    }
    
}
