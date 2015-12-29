var socket;
var playerOne;
var playerTwo;
var score = 0;
var role = "shooter";
var playerOneBulletGroup;

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

var mainState = function (game) {
    this.paddleLeft_up;
    this.paddleLeft_down;
    this.paddleLeft_fire;

    this.tf_lives;
    this.tf_score;
    this.paddleLives = paddleProperties.lives;

    this.paddleGroup;
    playerOneBulletGroup;
    this.asteroidGroup;
    this.asteroidsCount = asteroidProperties.startingAsteroids;
};

// The main state that contains our game. Think of states like pages or screens such as the splash screen, main menu, game screen, high scores, inventory, etc.
mainState.prototype = {

    preload: function () {
        game.load.image(graphicAssets.paddle.name, graphicAssets.paddle.URL);
        game.load.image(graphicAssets.bullet.name, graphicAssets.bullet.URL);
        game.load.image(graphicAssets.asteroidLarge.name, graphicAssets.asteroidLarge.URL);
        game.load.image(graphicAssets.asteroidMedium.name, graphicAssets.asteroidMedium.URL);
    },

    create: function () {
        socket = io.connect('http://192.168.1.13:8000');
        this.initGraphics();
        this.initPhysics();
        this.initKeyboard();
        this.resetAsteroids();
        this.setEventHandlers();
    },

    update: function () {
        this.asteroidGroup.forEachExists(this.checkBoundaries, this);
        this.movePlayer();
        this.fire();

        game.physics.arcade.overlap(playerOneBulletGroup, this.asteroidGroup, this.asteroidCollision, null, this);
        game.physics.arcade.overlap(playerOne, this.asteroidGroup, this.asteroidCollision, null, this);
        game.physics.arcade.overlap(playerTwo, this.asteroidGroup, this.blockAsteroid, null, this);
    },

    initPhysics: function () {
        this.paddleGroup = game.add.group();
        this.paddleGroup.enableBody = true;
        this.paddleGroup.physicsBodyType = Phaser.Physics.ARCADE;

        this.paddleGroup.add(playerOne);
        this.paddleGroup.add(playerTwo);

        this.paddleGroup.setAll('checkWorldBounds', true);
        this.paddleGroup.setAll('body.collideWorldBounds', true);
        this.paddleGroup.setAll('body.immovable', true);

        playerOneBulletGroup = game.add.group();
        playerOneBulletGroup.enableBody = true;
        playerOneBulletGroup.physicsBodyType = Phaser.Physics.ARCADE;
        playerOneBulletGroup.createMultiple(30, graphicAssets.bullet.name);

        this.asteroidGroup = game.add.group();
        this.asteroidGroup.enableBody = true;
        this.asteroidGroup.physicsBodyType = Phaser.Physics.ARCADE;
    },

    initGraphics: function () {
        playerOne = game.add.sprite(gameProperties.paddleLeft_x, game.world.centerY, graphicAssets.paddle.name);
        playerOne.anchor.set(0.5, 0.5);
        playerTwo = game.add.sprite(game.world.centerX, game.world.centerY, graphicAssets.paddle.name);
        playerTwo.anchor.set(0.5, 0.5);
        this.tf_lives = game.add.text(20, 10, paddleProperties.lives, fontAssets.counterFontStyle);
        this.tf_score = game.add.text(gameProperties.screenWidth - 20, 10, "0", fontAssets.counterFontStyle);
        this.tf_score.align = 'right';
        this.tf_score.anchor.set(1, 0);
    },

    initKeyboard: function () {
        this.paddleLeft_up = game.input.keyboard.addKey(Phaser.Keyboard.UP);
        this.paddleLeft_down = game.input.keyboard.addKey(Phaser.Keyboard.DOWN);
        this.paddleLeft_fire = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
    },

    movePlayer: function () {
        if (role == "shooter") {
            if (this.paddleLeft_up.isDown) {
                playerOne.body.velocity.y = -gameProperties.paddleVelocity;
            }
            else if (this.paddleLeft_down.isDown) {
                playerOne.body.velocity.y = gameProperties.paddleVelocity;
            } else {
                playerOne.body.velocity.y = 0;
            }
            socket.emit('movePlayer', {role: "shooter", x: playerOne.x, y: playerOne.y})
        } else {
            if (this.paddleLeft_up.isDown) {
                playerTwo.body.velocity.y = -gameProperties.paddleVelocity;
            }
            else if (this.paddleLeft_down.isDown) {
                playerTwo.body.velocity.y = gameProperties.paddleVelocity;
            } else {
                playerTwo.body.velocity.y = 0;
            }
            socket.emit('movePlayer', {role: "defender", x: playerTwo.x, y: playerTwo.y})
        }
    },

    fire: function () {
        if (this.paddleLeft_fire.isDown && role == "shooter" && this.paddleLives > 0) {
            var bullet = playerOneBulletGroup.getFirstExists(false);

            if (bullet) {
                bullet.reset(playerOne.x + 8, playerOne.y);
                bullet.body.velocity.x = 400;
                bullet.lifespan = bulletProperties.lifeSpan;
            }
            socket.emit('shooterFired');
        }
    },

    createAsteroid: function (x, y, size, pieces) {
        if (pieces === undefined) {
            pieces = 1;
        }
        for (var i = 0; i < pieces; i++) {
            var asteroid = this.asteroidGroup.create(x, y, size);
            asteroid.reset(x, y);
            asteroid.body.velocity.x = -200;
        }
    },

    resetAsteroids: function () {
        for (var i = 0; i < this.asteroidsCount; i++) {
            var x;
            var y;

            x = gameProperties.screenWidth;
            y = Math.random() * game.world.centerY;

            this.createAsteroid(x, y, graphicAssets.asteroidLarge.name);
        }
    },

    blockAsteroid: function (target, asteroid) {
        asteroid.kill();
        this.splitAsteroid(asteroid);
        this.updateScore(asteroidProperties[asteroid.key].score);
    },

    asteroidCollision: function (target, asteroid) {
        target.kill();
        asteroid.kill();
        this.splitAsteroid(asteroid);

        if (target.key == graphicAssets.paddle.name) {
            this.destroyPaddle();
        }
        this.updateScore(asteroidProperties[asteroid.key].score);
    },

    destroyPaddle: function () {
        this.paddleLives--;
        this.tf_lives.text = this.paddleLives;
        if (this.paddleLives) {
            this.resetPaddle();
        }
    },

    resetPaddle: function () {
        playerOne.reset(gameProperties.paddleLeft_x, game.world.centerY);
    },

    splitAsteroid: function (asteroid) {
        if (asteroidProperties[asteroid.key].nextSize) {
            this.createAsteroid(gameProperties.screenWidth, Math.random() * gameProperties.screenHeight, asteroidProperties[asteroid.key].nextSize, asteroidProperties[asteroid.key].pieces);
        }

        if (!this.asteroidGroup.countLiving()) {
            game.time.events.add(Phaser.Timer.SECOND * 3, this.nextLevel, this);
        }
    },

    checkBoundaries: function (sprite) {
        if (sprite.x < 0) {
            sprite.x = gameProperties.screenWidth;
            sprite.y = Math.random() * gameProperties.screenHeight;
        }
    },

    nextLevel: function () {
        this.asteroidGroup.removeAll(true);

        if (this.asteroidsCount < asteroidProperties.maxAsteroids) {
            this.asteroidsCount += asteroidProperties.incrementAsteroids;
        }

        this.resetAsteroids();
    },

    setEventHandlers: function () {
        socket.on("connect", this.onSocketConnected);
        socket.on("disconnect", this.onSocketDisconnect);
        socket.on("newPlayer", this.onNewPlayer);
        socket.on("movePlayer", this.onMovePlayer);
        socket.on("shooterFired", this.onShooterFired);
        socket.on("roleAssigned", this.onRoleAssigned);
    },

    onSocketConnected: function () {
        console.log("Connected to socket server");
    },

    onSocketDisconnect: function () {
        console.log("Disconnected from socket server");
    },

    onNewPlayer: function (data) {
        console.log("New player connected: " + data.id);
    },

    onMovePlayer: function (data) {
        if (data.role == "shooter") {
            playerOne.x = data.x;
            playerOne.y = data.y;
        } else {
            playerTwo.x = data.x;
            playerTwo.y = data.y;
        }
    },

    onShooterFired: function () {
        var bullet = playerOneBulletGroup.getFirstExists(false);
        if (bullet) {
            bullet.reset(playerOne.x + 8, playerOne.y);
            bullet.body.velocity.x = 400;
            bullet.lifespan = bulletProperties.lifeSpan;
        }
    },

    onRoleAssigned: function (data) {
        if (data.id == socket.socket.sessionid) {
            role = data.role;
        }
    },

    updateScore: function (points) {
        score += points;
        this.tf_score.text = score;
    }

};

var game = new Phaser.Game(gameProperties.screenWidth, gameProperties.screenHeight, Phaser.AUTO, 'gameDiv');
game.state.add('main', mainState);
game.state.start('main');