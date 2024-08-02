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
                    if (response.headers['x-rate-limit-reset']){
                        if (!node?.ratelimitreset){
                            // suspect issues caused by clock skew between host and server setting reset to at least 1 minute from now
                            node.ratelimitreset=Math.max(Date.parse(response.headers['x-rate-limit-reset']),(Date.now() + 60000));
                        }else{
                            if (Date.parse(response.headers['x-rate-limit-reset'])>parseInt(node.ratelimitreset)){
                                // somehow we got a new reset value that is greater than the stored value
                                // follow the same approach as above
                                node.ratelimitreset=Math.max(Date.parse(response.headers['x-rate-limit-reset']),(Date.now() + 60000));
                            }
                        }
                        if(response.headers['x-rate-limit-remaining']){
                            node.ratelimitremaining=response.headers['x-rate-limit-remaining'];
                        }
                    }
                    
                    resolve({
                        status: response.statusCode,
                        rateLimitRemaining: response.headers['x-rate-limit-remaining'],
                        rateLimitTimeout:  Date.parse(response.headers['x-rate-limit-reset']),
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

    RaptCredentialsNode.prototype.authorise = function(callingnode) {
        var node = this;
        
        if (node?.token){
            var token = node.token;
            const exp = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()).exp;
            //treat token as expired if it will expire in the next 30 seconds
            const token_expired = ((Date.now() +30000) >= (exp * 1000));
            if (!token_expired){
                 return Promise.resolve(token);;
            }
        }
        let credentials = node.credentials;
        let url = "https://id.rapt.io/connect/token";
        var parms = { password: credentials.api_secret, username: credentials.user_name, client_id: "rapt-user", grant_type: "password" };
        callingnode.status({fill:"blue",shape:"dot",text:"authorising"});
        return this.post(url,null,null,parms).then(function(result) {
            var res = result.body;
            var resobject = JSON.parse(res);
            if (resobject?.access_token) {
                node.token = resobject.access_token;
                callingnode.status({});
                return node.token;
            } else {
                throw new Error("failed to get a token: " + res);
            }

        }).catch(function(err) {
            node.error(err);
        })
    }
    
    RaptCredentialsNode.prototype.ratelimit = function(callingnode) {
        var node = this;
        if (node?.ratelimitreset){
            var timeremaining = parseInt(node.ratelimitreset) - Date.now();
            if (timeremaining > 0) {
                if (node?.ratelimitremaining){
                    if (node.ratelimitremaining < 1){
                        callingnode.status({fill:"yellow",shape:"dot",text:"rate-limiting"});
                        return new Promise((resolve) => setTimeout(resolve, timeremaining))
                    }
                }
            }
            else{
                delete node.ratelimitremaining;
                delete node.ratelimitreset;
            }
        }
        return new Promise((resolve) => setTimeout(resolve, 0));
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
        
        node.on('input', function(msg) {
            node.processMsg(msg);
        });
    }
    
    RED.nodes.registerType("rapt-pull",RaptPullNode);
    

    RaptPullNode.prototype.getEndpoint = function(endpointurl, opts) {
        var node = this;
        let url = "https://api.rapt.io/api/Hydrometers/"+endpointurl;
        node.status({fill:"blue",shape:"dot",text:"requesting"});
        return node.raptConfig.get(url,opts).then(function(result) {
            var res = result.body;
            node.status({});
            return res;
        }).catch(function(err) {
            node.error(err);
        })
    }
    RaptPullNode.prototype.processMsg = async function(msg) {
        var node = this;
        var nodeContext = this.context();
        let endpoint = node.endpoint;
        let topic = node.topic || endpoint;
        let split = node.split;
        let payload = msg.payload;
        if (!Array.isArray(payload)){
            payload = [payload];
        }
        let msgstart = msg?.start;
        let msgend = msg?.end;

        for (const element of payload){
            await node.processElement(element, endpoint, topic, split,msgstart,msgend);
        }
    }
    
    RaptPullNode.prototype.processElement = async function(element, endpoint, topic, split,msgstart,msgend) {
        var node = this;
        var nodeContext = this.context();
        var opts = {};
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
                let start = msgstart || lasttelemetry || Date.now();
                let startDate = new Date(start);
                let end = msgend || Date.now();
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

        return node.raptConfig.ratelimit(node)
        .then(() =>node.raptConfig.authorise(node))
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
    }

}
