var playerOne;
var playerTwo;
var score = 0;
var role = "shooter";
var playerOneBulletGroup;
var socket;
var paddleLeft_up;
var paddleLeft_down;
var paddleLeft_fire;
var randomNumberCount = 0;
var randomNumbers = [];

var fontAssets = {
    counterFontStyle: {font: '20px Arial', fill: '#FFFFFF', align: 'center'},
};

var gameProperties = {
    screenWidth: 640,
    screenHeight: 480,

    paddleLeft_x: 50,
    paddleVelocity: 600
};

var paddleProperties = {
    lives: 3
};

var bulletProperties = {
    speed: 400,
    interval: 250,
    lifeSpan: 2000,
    maxCount: 30
};

var graphicAssets = {
    paddle: {URL: 'assets/paddle.png', name: 'paddle'},
    bullet: {URL: 'assets/bullet.png', name: 'bullet'},
    asteroidLarge: {URL: 'assets/asteroidLarge.png', name: 'asteroidLarge'},
    asteroidMedium: {URL: 'assets/asteroidMedium.png', name: 'asteroidMedium'},
};

var asteroidProperties = {
    startingAsteroids: 4,
    maxAsteroids: 20,
    incrementAsteroids: 2,

    asteroidLarge: {
        minVelocity: 50,
        maxVelocity: 150,
        minAngularVelocity: 0,
        maxAngularVelocity: 200,
        score: 20,
        nextSize: graphicAssets.asteroidMedium.name,
        pieces: 2
    },
    asteroidMedium: {minVelocity: 50, maxVelocity: 200, minAngularVelocity: 0, maxAngularVelocity: 200, score: 50}
};

var tf_lives;
var tf_score;
var paddleLives = paddleProperties.lives;
var paddleGroup;
var asteroidGroup;
var asteroidCount = asteroidProperties.startingAsteroids;

var game = new Phaser.Game(gameProperties.screenWidth, gameProperties.screenHeight, Phaser.AUTO, 'gameDiv',
    {preload: preload, create: create, update: update});

function preload() {
    game.load.image(graphicAssets.paddle.name, graphicAssets.paddle.URL);
    game.load.image(graphicAssets.bullet.name, graphicAssets.bullet.URL);
    game.load.image(graphicAssets.asteroidLarge.name, graphicAssets.asteroidLarge.URL);
    game.load.image(graphicAssets.asteroidMedium.name, graphicAssets.asteroidMedium.URL);
}

function create() {
    socket = io.connect('http://192.168.1.13:8000');
    initGraphics();
    initPhysics();
    initKeyboard();
    setEventHandlers();
}

function setEventHandlers() {
    socket.on("connect", onSocketConnected);
    socket.on("disconnect", onSocketDisconnect);
    socket.on("newPlayer", onNewPlayer);
    socket.on("movePlayer", onMovePlayer);
    socket.on("shooterFired", onShooterFired);
    socket.on("roleAssigned", onRoleAssigned);
    socket.on("startGame", startGame);
}

function update() {
    asteroidGroup.forEachExists(checkBoundaries, this);
    movePlayer();
    fire();

    game.physics.arcade.overlap(playerOneBulletGroup, asteroidGroup, asteroidCollision, null, this);
    game.physics.arcade.overlap(playerOne, asteroidGroup, asteroidCollision, null, this);
    game.physics.arcade.overlap(playerTwo, asteroidGroup, blockAsteroid, null, this);
}

function initPhysics() {
    paddleGroup = game.add.group();
    paddleGroup.enableBody = true;
    paddleGroup.physicsBodyType = Phaser.Physics.ARCADE;

    paddleGroup.add(playerOne);
    paddleGroup.add(playerTwo);

    paddleGroup.setAll('checkWorldBounds', true);
    paddleGroup.setAll('body.collideWorldBounds', true);
    paddleGroup.setAll('body.immovable', true);

    playerOneBulletGroup = game.add.group();
    playerOneBulletGroup.enableBody = true;
    playerOneBulletGroup.physicsBodyType = Phaser.Physics.ARCADE;
    playerOneBulletGroup.createMultiple(30, graphicAssets.bullet.name);

    asteroidGroup = game.add.group();
    asteroidGroup.enableBody = true;
    asteroidGroup.physicsBodyType = Phaser.Physics.ARCADE;
}

function initGraphics() {
    playerOne = game.add.sprite(gameProperties.paddleLeft_x, game.world.centerY, graphicAssets.paddle.name);
    playerOne.anchor.set(0.5, 0.5);
    playerTwo = game.add.sprite(game.world.centerX, game.world.centerY, graphicAssets.paddle.name);
    playerTwo.anchor.set(0.5, 0.5);
    tf_lives = game.add.text(20, 10, paddleProperties.lives, fontAssets.counterFontStyle);
    tf_score = game.add.text(gameProperties.screenWidth - 20, 10, "0", fontAssets.counterFontStyle);
    tf_score.align = 'right';
    tf_score.anchor.set(1, 0);
}

function initKeyboard() {
    paddleLeft_up = game.input.keyboard.addKey(Phaser.Keyboard.UP);
    paddleLeft_down = game.input.keyboard.addKey(Phaser.Keyboard.DOWN);
    paddleLeft_fire = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
}

function movePlayer() {
    if (role == "shooter") {
        if (paddleLeft_up.isDown) {
            playerOne.body.velocity.y = -gameProperties.paddleVelocity;
        }
        else if (paddleLeft_down.isDown) {
            playerOne.body.velocity.y = gameProperties.paddleVelocity;
        } else {
            playerOne.body.velocity.y = 0;
        }
        socket.emit('movePlayer', {role: "shooter", x: playerOne.x, y: playerOne.y})
    } else {
        if (paddleLeft_up.isDown) {
            playerTwo.body.velocity.y = -gameProperties.paddleVelocity;
        }
        else if (paddleLeft_down.isDown) {
            playerTwo.body.velocity.y = gameProperties.paddleVelocity;
        } else {
            playerTwo.body.velocity.y = 0;
        }
        socket.emit('movePlayer', {role: "defender", x: playerTwo.x, y: playerTwo.y})
    }
}

function fire() {
    if (paddleLeft_fire.isDown && role == "shooter" && paddleLives > 0) {
        var bullet = playerOneBulletGroup.getFirstExists(false);

        if (bullet) {
            bullet.reset(playerOne.x + 8, playerOne.y);
            bullet.body.velocity.x = 400;
            bullet.lifespan = bulletProperties.lifeSpan;
        }
        socket.emit('shooterFired');
    }
}

function resetAsteroids(data) {
    for (var i = 0; i < asteroidCount; i++) {
        var x;
        var y;

        x = gameProperties.screenWidth;
        y = data[i] * game.world.centerY;

        createAsteroid(x, y, graphicAssets.asteroidLarge.name);
    }
}

function createAsteroid(x, y, size, pieces) {
    if (pieces === undefined) {
        pieces = 1;
    }
    for (var i = 0; i < pieces; i++) {
        var asteroid = asteroidGroup.create(x, y, size);
        asteroid.reset(x, y);
        asteroid.body.velocity.x = -200;
    }
}

function blockAsteroid(target, asteroid) {
    asteroid.kill();
    splitAsteroid(asteroid);
    updateScore(asteroidProperties[asteroid.key].score);
}

function asteroidCollision(target, asteroid) {
    target.kill();
    asteroid.kill();
    splitAsteroid(asteroid);

    if (target.key == graphicAssets.paddle.name) {
        destroyPaddle();
    }
    updateScore(asteroidProperties[asteroid.key].score);
}

function destroyPaddle() {
    paddleLives--;
    tf_lives.text = paddleLives;
    if (paddleLives) {
        resetPaddle();
    }
}

function resetPaddle() {
    playerOne.reset(gameProperties.paddleLeft_x, game.world.centerY);
}

function splitAsteroid(asteroid) {
    if (asteroidProperties[asteroid.key].nextSize) {
        createAsteroid(gameProperties.screenWidth, randomNumbers[randomNumberCount] * gameProperties.screenHeight, asteroidProperties[asteroid.key].nextSize, asteroidProperties[asteroid.key].pieces);
    }

    if (!asteroidGroup.countLiving()) {
        game.time.events.add(Phaser.Timer.SECOND * 3, nextLevel, this);
    }

    incrementRandomNumberCount();
}

function checkBoundaries(sprite) {
    if (sprite.x < 0) {
        sprite.x = gameProperties.screenWidth;
        sprite.y = randomNumbers[randomNumberCount] * gameProperties.screenHeight;
    }
    incrementRandomNumberCount();
}

function incrementRandomNumberCount() {
    if(randomNumberCount == randomNumbers.length){
        randomNumberCount = 0;
    } else{
        randomNumberCount++;
    }
}

function nextLevel() {
    asteroidGroup.removeAll(true);

    if (asteroidCount < asteroidProperties.maxAsteroids) {
        asteroidCount += asteroidProperties.incrementAsteroids;
    }

    socket.emit("startGame", {number: asteroidCount});
}

function onSocketConnected() {
    console.log("Connected to socket server");
}

function onSocketDisconnect() {
    console.log("Disconnected from socket server");
}

function onNewPlayer(data) {
    console.log("New player connected: " + data.id);
}

function onMovePlayer(data) {
    if (data.role == "shooter") {
        playerOne.x = data.x;
        playerOne.y = data.y;
    } else {
        playerTwo.x = data.x;
        playerTwo.y = data.y;
    }
}

function onShooterFired() {
    var bullet = playerOneBulletGroup.getFirstExists(false);
    if (bullet) {
        bullet.reset(playerOne.x + 8, playerOne.y);
        bullet.body.velocity.x = 400;
        bullet.lifespan = bulletProperties.lifeSpan;
    }
}

function onRoleAssigned(data) {
    if (data.id == socket.socket.sessionid) {
        role = data.role;
        if (role == "defender") {
            socket.emit("startGame", {number: asteroidCount});
        }
    }
}

function startGame(data) {
    randomNumbers = data.randomNumbers;
    resetAsteroids(data.randomNumbers);
}

function updateScore(points) {
    score += points;
    tf_score.text = score;
}