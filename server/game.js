var util = require('util');
var http = require('http');
var path = require('path');
var io = require('socket.io');
var ecstatic = require('ecstatic');

var Player = require('./Player');

var socket;
var port = 8080;
var players = [];

// Create and start the http server
var server = http.createServer(
    ecstatic({root: path.resolve(__dirname, '../public')})
).listen(port, function (err) {
    if (err) {
        throw err
    }
    init()
});

function init() {
    // Attach Socket.IO to server
    socket = io.listen(server);

    // Configure Socket.IO
    socket.configure(function () {
        // Only use WebSockets
        socket.set('transports', ['websocket']);

        // Restrict log output
        socket.set('log level', 2)
    });
    setEventHandlers()
}

function setEventHandlers() {
    socket.sockets.on('connect', onSocketConnection)
}

function onSocketConnection(client) {
    console.log("New client has connected: " + client);

    // Listen for new player message
    client.on('newPlayer', onNewPlayer)
}

// New player has joined
function onNewPlayer (data) {
    // Create a new player
    var newPlayer = new Player(data.x, data.y);
    newPlayer.id = this.id;

    // Add new player to the players array
    players.push(newPlayer)
}
