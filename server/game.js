var util = require('util');
var http = require('http');
var path = require('path');
var io = require('socket.io');
var ecstatic = require('ecstatic');

var shooter;
var defender;

var socket;
var playerCount = 0;
var port = 8000;

var log4js = require('log4js');
var logger = log4js.getLogger();

var server = http.createServer(
    ecstatic({root: path.resolve(__dirname, '../public')})
).listen(port, function (err) {
    if (err) {
        throw err
    }
    init()
});

function init() {
    log4js.replaceConsole();

    // Attach Socket.IO to server
    socket = io.listen(server);

    // Configure Socket.IO
    socket.configure(function () {
        // Only use WebSockets
        socket.set('transports', ['websocket']);

        // Restrict log output
        socket.set('log level', 2)
    });
    setEventHandlers();
    logger.info("Finished socket.io init");
}

function setEventHandlers() {
    socket.sockets.on('connection', onSocketConnection);
    logger.info("Event Handlers configured")
}

function onSocketConnection(client) {
    logger.info("New client has connected: " + client);

    if(playerCount > 0) {
        defender = client.id;
        logger.info("Player given role of defender");
        this.emit("roleAssigned", {id: client.id, role: "defender"});
    } else {
        shooter = client.id;
        logger.info("Player given role of shooter");
        this.emit("roleAssigned", {id: client.id, role:"shooter"});
    }

    playerCount++;
    client.on('newPlayer', onNewPlayer);
    client.on("movePlayer", onMovePlayer);
    client.on("shooterFired", onShooterFired);
}

function onNewPlayer (data) {
    logger.info("New remote player joined!");
}

function onMovePlayer(data) {
    // Broadcast updated position to connected socket clients
    this.broadcast.emit('movePlayer', {role: data.role, x: data.x, y: data.y})
}

function onShooterFired() {
    // Broadcast updated position to connected socket clients
    this.broadcast.emit('shooterFired')
}
