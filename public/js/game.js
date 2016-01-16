var playerOne;
var playerTwo;
var score = 0;
var role = "shooter";
var playerOneBulletGroup;
var explosionMediumGroup;
var socket;
var paddleLeft_up;
var paddleLeft_down;
var paddleLeft_fire;
var randomNumberCount = 0;
var randomNumbers = [];
var isGameOver = false;
var level = 1;

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
    lives: 5
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
    background: {URL: 'assets/background.png', name: 'background'},
    asteroidMedium: {URL: 'assets/asteroidMedium.png', name: 'asteroidMedium'},
    explosionMedium: {URL: 'assets/explosionMedium.png', name: 'explosionMedium', width: 58, height: 58, frames: 8}
};

var asteroidProperties = {
    startingAsteroids: 4,
    maxAsteroids: 12,
    incrementAsteroids: 1,
    asteroidMedium: {
        minVelocity: 50,
        maxVelocity: 200,
        minAngularVelocity: 0,
        maxAngularVelocity: 200,
        score: 50,
        explosion: 'explosionMedium'
    }
};

var text_lives;
var text_score;
var text_status;

var paddleLives = paddleProperties.lives;
var paddleGroup;
var asteroidGroup;
var asteroidCount = asteroidProperties.startingAsteroids;

// Disconnect on navigation away / refresh

window.onunload = function () {
    socket.emit('disconnect');
};

// Game creation

var game = new Phaser.Game(gameProperties.screenWidth, gameProperties.screenHeight, Phaser.AUTO, 'gameDiv',
    {preload: preload, create: create, update: update});

function preload() {
    game.load.image(graphicAssets.background.name, graphicAssets.background.URL);
    game.load.image(graphicAssets.paddle.name, graphicAssets.paddle.URL);
    game.load.image(graphicAssets.bullet.name, graphicAssets.bullet.URL);
    game.load.image(graphicAssets.asteroidMedium.name, graphicAssets.asteroidMedium.URL);
    game.load.spritesheet(graphicAssets.explosionMedium.name, graphicAssets.explosionMedium.URL, graphicAssets.explosionMedium.width, graphicAssets.explosionMedium.height, graphicAssets.explosionMedium.frames);
}

function create() {
    socket = io.connect('http://192.168.1.16:8000', {
        reconnection: false
    });
    initGraphics();
    initPhysics();
    initKeyboard();
    setEventHandlers();
}

function setEventHandlers() {
    socket.on("connect", onSocketConnected);
    socket.on("movePlayer", onMovePlayer);
    socket.on("shooterFired", onShooterFired);
    socket.on("roleAssigned", onRoleAssigned);
    socket.on("waitForPlayers", waitForPlayers);
    socket.on("startGame", startGame);
    socket.on("startNextLevel", startNextLevel);
    socket.on("gameFull", gameFull);
    socket.on("onPlayerDisconnected", onPlayerDisconnected);
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
    game.add.sprite(0, 0, graphicAssets.background.name);

    playerOne = game.add.sprite(gameProperties.paddleLeft_x, game.world.centerY, graphicAssets.paddle.name);
    playerOne.anchor.set(0.5, 0.5);
    playerTwo = game.add.sprite(game.world.centerX, game.world.centerY, graphicAssets.paddle.name);
    playerTwo.anchor.set(0.5, 0.5);

    text_lives = game.add.text(20, 10, paddleProperties.lives, fontAssets.counterFontStyle);
    text_score = game.add.text(gameProperties.screenWidth - 20, 10, "0", fontAssets.counterFontStyle);
    text_score.align = 'right';
    text_score.anchor.set(1, 0);

    explosionMediumGroup = game.add.group();
    explosionMediumGroup.createMultiple(20, graphicAssets.explosionMedium.name, 0);
    explosionMediumGroup.setAll('anchor.x', 0.5);
    explosionMediumGroup.setAll('anchor.y', 0.5);
    explosionMediumGroup.callAll('animations.add', 'animations', 'explode', null, 30);
}

function initKeyboard() {
    paddleLeft_up = game.input.keyboard.addKey(Phaser.Keyboard.UP);
    paddleLeft_down = game.input.keyboard.addKey(Phaser.Keyboard.DOWN);
    paddleLeft_fire = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
}

// Game play Methods

function update() {
    asteroidGroup.forEachExists(checkBoundaries, this);
    movePlayer();
    fire();

    game.physics.arcade.overlap(playerOneBulletGroup, asteroidGroup, asteroidCollision, null, this);
    game.physics.arcade.overlap(playerOne, asteroidGroup, asteroidCollision, null, this);
    game.physics.arcade.overlap(playerTwo, asteroidGroup, blockAsteroid, null, this);
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
    for (var i = 0; i < data.length; i++) {

        var x;
        var y;

        x = gameProperties.screenWidth;
        y = data[i] * game.world.centerY;

        createAsteroid(x, y, graphicAssets.asteroidMedium.name);
    }
}

function createAsteroid(x, y, size) {
    var asteroid = asteroidGroup.create(x, y, size);
    asteroid.reset(x, y);

    var velocity = randomNumbers[randomNumberCount] * -200 * (level * 0.1);

    console.log(velocity);
    if(isNaN(velocity)) {
        velocity = -200;
    }
    asteroid.body.velocity.x = velocity;
    incrementRandomNumberCount();
}

function blockAsteroid(target, asteroid) {
    asteroid.kill();
    checkLivingAsteroids();
    updateScore(asteroidProperties[asteroid.key].score);
    explosion(asteroid)
}

function explosion(asteroid) {
    var explosion;

    explosion = explosionMediumGroup.getFirstExists(false);

    if (explosion != null) {
        explosion.reset(asteroid.x, asteroid.y);
        explosion.animations.play('explode', null, false, true);
    }
}

function asteroidCollision(target, asteroid) {
    asteroid.kill();
    target.kill();

    if (target.key == graphicAssets.paddle.name) {
        destroyPaddle();
    }
    updateScore(asteroidProperties[asteroid.key].score);
    explosion(asteroid);
    checkLivingAsteroids();
}

function destroyPaddle() {
    if (paddleLives != 0) {
        --paddleLives;
        text_lives.text = paddleLives;
    }
    if (paddleLives) {
        game.time.events.add(Phaser.Timer.SECOND, resetPaddle, this);
    } else {
        gameOver();
    }
}

function resetPaddle() {
    playerOne.reset(gameProperties.paddleLeft_x, game.world.centerY);
}

function checkLivingAsteroids() {
    if (!asteroidGroup.countLiving() && !isGameOver) {
        game.time.events.add(Phaser.Timer.SECOND, nextLevel, this);
    }
}

function checkBoundaries(sprite) {
    if (sprite.x < 0) {
        sprite.x = gameProperties.screenWidth;
        sprite.y = randomNumbers[randomNumberCount] * gameProperties.screenHeight;
        sprite.velocity = randomNumberCount * 100;
        incrementRandomNumberCount();
    }
}

function incrementRandomNumberCount() {
    if (randomNumberCount == randomNumbers.length) {
        randomNumberCount = 0;
    } else {
        randomNumberCount++;
    }
}

function nextLevel() {
    asteroidGroup.removeAll();

    if (asteroidCount < asteroidProperties.maxAsteroids) {
        asteroidCount += asteroidProperties.incrementAsteroids;
    }

    socket.emit("startNextLevel", {number: asteroidCount});
}

// Event Listeners

function onSocketConnected() {
    console.log("Connected to socket server");
}

function onPlayerDisconnected() {
    console.log("Player disconnected");
    if (text_status.alive) {
        text_status.destroy();
    }
    text_status = game.add.text(game.width / 2, game.height / 3.0, "Not enough players to continue, try refreshing", fontAssets.counterFontStyle);
    text_status.align = 'center';
    text_status.anchor.set(0.5);
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
        console.log("Assigned role: " + data.role);
        if (role == "defender") {
            socket.emit("startGame", {number: asteroidCount});
        } else if (role == "spectator") {
            gameFull();
        }
    }
}

// Game Coordination

function startGame(data) {
    console.log("Starting the game");
    if (text_status != undefined) {
        text_status.destroy();
    }
    level = 1;
    score = 0;
    text_score.text = score;
    paddleLives = 5;
    text_lives.text = paddleLives;

    isGameOver = false;

    asteroidGroup.removeAll();

    randomNumbers = data.randomNumbers;
    resetAsteroids(data.randomNumbers);
}

function startNextLevel(data) {
    asteroidGroup.removeAll();
    randomNumbers = data.randomNumbers;
    resetAsteroids(data.randomNumbers);
    level++;
    console.log("randomNumbers for new level: " + randomNumbers);
}

function gameOver() {
    asteroidGroup.removeAll();
    socket.emit("gameOver");
    showStatus("Shooter Died, Game Over!");
    isGameOver = true;
}

function gameFull() {
    text_status = game.add.text(game.width / 2, game.height / 3.0, "Sorry all games are full!", fontAssets.counterFontStyle);
    text_status.align = 'center';
    text_status.anchor.set(0.5);

    game.input.keyboard.removeKey(Phaser.Keyboard.UP);
    game.input.keyboard.removeKey(Phaser.Keyboard.DOWN);
    game.input.keyboard.removeKey(Phaser.Keyboard.SPACEBAR);
}

function waitForPlayers() {
    console.log("Waiting for additional players");
    showStatus("Waiting for another player")
}

// Util Methods

function updateScore(points) {
    score += points;
    text_score.text = score;
}

function showStatus(text) {
    if (role != "spectator") {
        if (text_status != undefined && text_status.alive) {
            text_status.destroy();
        }
        text_status = game.add.text(game.width / 2, game.height / 3.0, text, fontAssets.counterFontStyle);
        text_status.align = 'center';
        text_status.anchor.set(0.5);
    }
}
