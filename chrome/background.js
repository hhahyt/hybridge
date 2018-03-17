/**
 *
 * @source: hybridge (chrome) background.js
 * @author: Matteo Nastasi <nastasi@alternativeoutout.it>
 * @link: https://github.com/nastasi/hybridge
 *
 * @licstart  The following is the entire license notice for the
 *  JavaScript code in this page.
 *
 * Copyright (C) 2018 Matteo Nastasi
 *
 *
 * The JavaScript code in this page is free software: you can
 * redistribute it and/or modify it under the terms of the GNU
 * General Public License (GNU GPL) as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option)
 * any later version.  The code is distributed WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE.  See the GNU GPL for more details.
 *
 * As additional permission under GNU GPL version 3 section 7, you
 * may distribute non-source (e.g., minimized or compacted) forms of
 * that code without the copy of the GNU GPL normally required by
 * section 4, provided you include this license notice and a URL
 * through which recipients can access the Corresponding Source.
 *
 * @licend  The above is the entire license notice
 * for the JavaScript code in this page.
 *
 */

console.log("background.js: begin");


function app_one(config) {
    console.log('app_one initialization');
    console.log(config);
    this.window = new window_feat(config, "app_one.html", 5000);
    this.config = config;
}

app_one.prototype = {
    window_open: function() {
        this.window.open();
    }
}

var config = {
    application_url: "localhost:8010/",
    server_url: "localhost:8000/",
    ws_address: "websocketserver",
    is_secure: false,
}

config.apps = {'app_one': new app_one(config)};


var hybridge = null;

function HyBridge(config) {
    this.ws_url = "ws" + (config.is_secure ? "s" : "") + "://" +
        config.application_url + config.ws_address;
}

HyBridge.prototype = {
    ws_url: "",
    ws: null,
    watchdog_hande: null,
    ws_connect: function() {
        var _this = this;

        console.log("ws_connect: begin");
        try {
            this.ws = new WebSocket(this.ws_url);
            this.ws.addEventListener('open', function (event) {
                console.log("WS OPEN fired");
            });
            this.ws.addEventListener('close', function (event) {
                console.log("WS CLOSE fired");
                _this.ws = null;
            });
            this.ws.addEventListener('error', function (event) {
                console.log("WS ERROR fired");
                this.close();
                _this.ws = null;
            });
            this.ws.addEventListener('message', function (event) {
                console.log("WS MESSAGE fired");
                console.log(event.data);
                var data = JSON.parse(event.data);

                if (data.app == undefined || data.command == undefined) {
                    console.log('malformed command, rejected' + data);
                    return;
                }

                if (! data.app in config.apps) {
                    console.log('app ' + data.app + ' not found');
                    return;
                }

                app = config.apps[data.app];
                if (! data.command in app) {
                    console.log('command '+ data.command + ' not found');
                    return;
                }

                app[data.command].apply(app, data.args);

            });
        }
        catch(err) {
            console.log('WS connection failed: '+ err.message);
        }
    },
    watchdog: function () {
        console.log("WD here " + this.ws);
        if (this.ws == null) {
            this.ws_connect();
        }
    },
    run: function () {
        var _this = this;
        this.ws_connect();

        // run watchdog to monitorize websocket
        this.watchdog_hande = setInterval(function wd_func(obj) { obj.watchdog(); }, 1000, _this);
    }
}

function main()
{
    hybridge = new HyBridge(config);
    hybridge.run()

    chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
        console.log("inside message !: [" + message.msg + "]");
        sendResponse({'reply': message.msg});
    });

    chrome.runtime.onMessageExternal.addListener(
        function(request, sender, sendResponse) {
            console.log("background.js: received msg: " + request.msg);
            sendResponse({'reply': request.msg});
        });

    chrome.runtime.onConnectExternal.addListener(function(port) {
        console.log("first step");
        console.assert(port.name == "web_page");
        console.log("second step");
        port.onMessage.addListener(function(msg) {
            console.log("port msg received");
            if (msg.joke == "Knock knock")
                port.postMessage({question: "Who's there?"});
            else if (msg.answer == "Madame")
                port.postMessage({question: "Madame who?"});
            else if (msg.answer == "Madame... Bovary") {
                port.postMessage({question: "I don't get it."});
                console.log("last msg");
            }
        });
    });
}

main();

console.log("background.js: end");

