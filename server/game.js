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

    if (playerCount == 1) {
        defender = client.id;
        logger.info("Player given role of defender");
        this.emit("roleAssigned", {id: client.id, role: "defender"});
        setupNewUser(client);
    } else if (playerCount == 0) {
        shooter = client.id;
        logger.info("Player given role of shooter");
        this.emit("roleAssigned", {id: client.id, role: "shooter"});
        this.emit("waitForPlayers");
        setupNewUser(client);
    } else {
        logger.info("Player given role of spectator");
        this.emit("roleAssigned", {id: client.id, role: "spectator"});
    }
}

function onSocketDisconnection() {
    logger.info("Client has disconnected: " + this.id);

    if (playerCount != 1) {
        gameOver();
    }

    this.broadcast.emit("onPlayerDisconnected");
}

function setupNewUser(client) {
    playerCount = playerCount + 1;
    client.on("startGame", startGame);
    client.on("startNextLevel", startNextLevel);
    client.on("movePlayer", onMovePlayer);
    client.on("shooterFired", onShooterFired);
    client.on("gameOver", gameOver);
    client.on("disconnect", onSocketDisconnection);
}

function startGame(data) {
    logger.info("startGame");
    var randomNumbers = generateRandomNumbers(data);
    this.emit('startGame', {randomNumbers: randomNumbers});
    this.broadcast.emit('startGame', {randomNumbers: randomNumbers});
}

function startNextLevel(data) {
    logger.info("startNextLevel");
    var randomNumbers = generateRandomNumbers(data);
    this.emit('startNextLevel', {randomNumbers: randomNumbers});
    this.broadcast.emit('startNextLevel', {randomNumbers: randomNumbers});
}

function gameOver() {
    logger.info("gameOver");
    playerCount = 0;
}

function onMovePlayer(data) {
    this.broadcast.emit('movePlayer', {role: data.role, x: data.x, y: data.y})
}

function onShooterFired() {
    this.broadcast.emit('shooterFired')
}

function generateRandomNumbers(data) {
    var randomNumbers = [];
    for (var i = 0; i < data.number; i++) {
        randomNumbers.push((Math.random() + 0.1).toFixed(1));
    }
    return randomNumbers;
}
