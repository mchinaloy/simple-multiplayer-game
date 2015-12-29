var gameProperties = {
    screenWidth: 640,
    screenHeight: 480,

    delayToStartLevel: 3,
    padding: 30
};

var states = {
    game: "game"
};

var graphicAssets = {
    ship: {URL: 'assets/ship.png', name: 'ship'},
    bullet: {URL: 'assets/bullet.png', name: 'bullet'},

    asteroidLarge: {URL: 'assets/asteroidLarge.png', name: 'asteroidLarge'},
    asteroidMedium: {URL: 'assets/asteroidMedium.png', name: 'asteroidMedium'},
    asteroidSmall: {URL: 'assets/asteroidSmall.png', name: 'asteroidSmall'}
};

var shipProperties = {
    startX: gameProperties.screenWidth * 0.5,
    startY: gameProperties.screenHeight * 0.5,
    acceleration: 300,
    drag: 100,
    maxVelocity: 300,
    angularVelocity: 200,
    startingLives: 3,
    timeToReset: 3,
    blinkDelay: 0.2
};

var bulletProperties = {
    speed: 400,
    interval: 250,
    lifeSpan: 2000,
    maxCount: 30
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
        nextSize: graphicAssets.asteroidMedium.name
    },
    asteroidMedium: {
        minVelocity: 50,
        maxVelocity: 200,
        minAngularVelocity: 0,
        maxAngularVelocity: 200,
        score: 50,
        nextSize: graphicAssets.asteroidSmall.name
    },
    asteroidLarge: {
        minVelocity: 50,
        maxVelocity: 150,
        minAngularVelocity: 0,
        maxAngularVelocity: 200,
        score: 20,
        nextSize: graphicAssets.asteroidMedium.name,
        pieces: 2
    },
    asteroidMedium: {
        minVelocity: 50,
        maxVelocity: 200,
        minAngularVelocity: 0,
        maxAngularVelocity: 200,
        score: 50,
        nextSize: graphicAssets.asteroidSmall.name,
        pieces: 2
    },
    asteroidSmall: {minVelocity: 50, maxVelocity: 300, minAngularVelocity: 0, maxAngularVelocity: 200, score: 100}
};

var fontAssets = {
    counterFontStyle: {font: '20px Arial', fill: '#FFFFFF', align: 'center'},
};

var gameState = function (game) {
    this.shipSprite;
    this.shipIsInvulnerable;

    this.key_left;
    this.key_right;
    this.key_thrust;
    this.key_fire;

    this.bulletGroup;
    this.asteroidGroup;

    this.tf_lives;
    this.tf_score;
};

gameState.prototype = {

    preload: function () {
        game.load.image(graphicAssets.asteroidLarge.name, graphicAssets.asteroidLarge.URL);
        game.load.image(graphicAssets.asteroidMedium.name, graphicAssets.asteroidMedium.URL);
        game.load.image(graphicAssets.asteroidSmall.name, graphicAssets.asteroidSmall.URL);

        game.load.image(graphicAssets.bullet.name, graphicAssets.bullet.URL);
        game.load.image(graphicAssets.ship.name, graphicAssets.ship.URL);
    },

    init: function () {
        this.score = 0;
        this.bulletInterval = 0;
        this.shipLives = shipProperties.startingLives;
        this.asteroidsCount = asteroidProperties.startingAsteroids;
    },

    create: function () {
        this.initGraphics();
        this.initPhysics();
        this.initKeyboard();
        this.resetAsteroids();
    },

    update: function () {
        this.checkPlayerInput();
        this.checkBoundaries(this.shipSprite);
        this.bulletGroup.forEachExists(this.checkBoundaries, this);
        this.asteroidGroup.forEachExists(this.checkBoundaries, this);

        game.physics.arcade.overlap(this.bulletGroup, this.asteroidGroup, this.asteroidCollision, null, this);

        if (!this.shipIsInvulnerable) {
            game.physics.arcade.overlap(this.shipSprite, this.asteroidGroup, this.asteroidCollision, null, this);
        }
    },

    initGraphics: function () {
        this.shipSprite = game.add.sprite(shipProperties.startX, shipProperties.startY, graphicAssets.ship.name);
        this.shipSprite.angle = -90;
        this.shipSprite.anchor.set(0.5, 0.5);

        this.bulletGroup = game.add.group();
        this.asteroidGroup = game.add.group();

        this.tf_lives = game.add.text(20, 10, shipProperties.startingLives, fontAssets.counterFontStyle);

        this.tf_score = game.add.text(gameProperties.screenWidth - 20, 10, "0", fontAssets.counterFontStyle);
        this.tf_score.align = 'right';
        this.tf_score.anchor.set(1, 0);
    },

    initPhysics: function () {
        game.physics.startSystem(Phaser.Physics.ARCADE);

        game.physics.enable(this.shipSprite, Phaser.Physics.ARCADE);
        this.shipSprite.body.drag.set(shipProperties.drag);
        this.shipSprite.body.maxVelocity.set(shipProperties.maxVelocity);

        this.bulletGroup.enableBody = true;
        this.bulletGroup.physicsBodyType = Phaser.Physics.ARCADE;
        this.bulletGroup.createMultiple(30, graphicAssets.bullet.name);
        this.bulletGroup.setAll('anchor.x', 0.5);
        this.bulletGroup.setAll('anchor.y', 0.5);
        this.bulletGroup.setAll('lifespan', bulletProperties.lifeSpan);

        this.asteroidGroup.enableBody = true;
        this.asteroidGroup.physicsBodyType = Phaser.Physics.ARCADE;
    },

    initKeyboard: function () {
        this.key_left = game.input.keyboard.addKey(Phaser.Keyboard.LEFT);
        this.key_right = game.input.keyboard.addKey(Phaser.Keyboard.RIGHT);
        this.key_thrust = game.input.keyboard.addKey(Phaser.Keyboard.UP);
        this.key_fire = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
    },

    checkPlayerInput: function () {
        if (this.key_left.isDown) {
            this.shipSprite.body.angularVelocity = -shipProperties.angularVelocity;
        } else if (this.key_right.isDown) {
            this.shipSprite.body.angularVelocity = shipProperties.angularVelocity;
        } else {
            this.shipSprite.body.angularVelocity = 0;
        }

        if (this.key_thrust.isDown) {
            game.physics.arcade.accelerationFromRotation(this.shipSprite.rotation, shipProperties.acceleration, this.shipSprite.body.acceleration);
        } else {
            this.shipSprite.body.acceleration.set(0);
        }

        if (this.key_fire.isDown) {
            this.fire();
        }
    },

    checkBoundaries: function (sprite) {
        if (sprite.x + gameProperties.padding < 0) {
            sprite.x = game.width + gameProperties.padding;
        } else if (sprite.x - gameProperties.padding> game.width) {
            sprite.x = -gameProperties.padding;
        }

        if (sprite.y + gameProperties.padding < 0) {
            sprite.y = game.height + gameProperties.padding;
        } else if (sprite.y - gameProperties.padding> game.height) {
            sprite.y = -gameProperties.padding;
        }
    },

    fire: function () {
        if(!this.shipSprite.alive) {
            return;
        }
        if (game.time.now > this.bulletInterval) {
            var bullet = this.bulletGroup.getFirstExists(false);

            if (bullet) {
                var length = this.shipSprite.width * 0.5;
                var x = this.shipSprite.x + (Math.cos(this.shipSprite.rotation) * length);
                var y = this.shipSprite.y + (Math.sin(this.shipSprite.rotation) * length);

                bullet.reset(x, y);
                bullet.lifespan = bulletProperties.lifeSpan;
                bullet.rotation = this.shipSprite.rotation;

                game.physics.arcade.velocityFromRotation(this.shipSprite.rotation, bulletProperties.speed, bullet.body.velocity);
                this.bulletInterval = game.time.now + bulletProperties.interval;
            }
        }
    },

    createAsteroid: function (x, y, size, pieces) {
        if (pieces === undefined) {
            pieces = 1;
        }

        for (var i = 0; i < pieces; i++) {
            var asteroid = this.asteroidGroup.create(x, y, size);
            asteroid.anchor.set(0.5, 0.5);
            asteroid.body.angularVelocity = game.rnd.integerInRange(asteroidProperties[size].minAngularVelocity, asteroidProperties[size].maxAngularVelocity);

            var randomAngle = game.math.degToRad(game.rnd.angle());
            var randomVelocity = game.rnd.integerInRange(asteroidProperties[size].minVelocity, asteroidProperties[size].maxVelocity);

            game.physics.arcade.velocityFromRotation(randomAngle, randomVelocity, asteroid.body.velocity);
        }
    },

    resetAsteroids: function () {
        for (var i = 0; i < this.asteroidsCount; i++) {
            var side = Math.round(Math.random());
            var x;
            var y;

            if (side) {
                x = Math.round(Math.random()) * gameProperties.screenWidth;
                y = Math.random() * gameProperties.screenHeight;
            } else {
                x = Math.random() * gameProperties.screenWidth;
                y = Math.round(Math.random()) * gameProperties.screenHeight;
            }

            this.createAsteroid(x, y, graphicAssets.asteroidLarge.name);
        }
    },

    asteroidCollision: function (target, asteroid) {
        target.kill();
        asteroid.kill();

        if (target.key == graphicAssets.ship.name) {
            this.destroyShip();
        }

        this.splitAsteroid(asteroid);
        this.updateScore(asteroidProperties[asteroid.key].score);

        if (!this.asteroidGroup.countLiving()) {
            game.time.events.add(Phaser.Timer.SECOND * gameProperties.delayToStartLevel, this.nextLevel, this);
        }
    },

    destroyShip: function () {
        this.shipLives--;
        this.tf_lives.text = this.shipLives;

        if (this.shipLives) {
            game.time.events.add(Phaser.Timer.SECOND * shipProperties.timeToReset, this.resetShip, this);
        } else {
            game.time.events.add(Phaser.Timer.SECOND * shipProperties.timeToReset, this.endGame, this);
        }
    },

    resetShip: function () {
        this.shipIsInvulnerable = true;
        this.shipSprite.reset(shipProperties.startX, shipProperties.startY);
        this.shipSprite.angle = -90;

        game.time.events.add(Phaser.Timer.SECOND * shipProperties.timeToReset, this.shipReady, this);
        game.time.events.repeat(Phaser.Timer.SECOND * shipProperties.blinkDelay, shipProperties.timeToReset / shipProperties.blinkDelay, this.shipBlink, this);
    },

    splitAsteroid: function (asteroid) {
        if (asteroidProperties[asteroid.key].nextSize) {
            this.createAsteroid(asteroid.x, asteroid.y, asteroidProperties[asteroid.key].nextSize, asteroidProperties[asteroid.key].pieces);
        }
    },

    updateScore: function (score) {
        this.score += score;
        this.tf_score.text = this.score;
    },

    nextLevel: function () {
        this.asteroidGroup.removeAll(true);

        if (this.asteroidsCount < asteroidProperties.maxAsteroids) {
            this.asteroidsCount += asteroidProperties.incrementAsteroids;
        }

        this.resetAsteroids();
    },

    shipReady: function () {
        this.shipIsInvulnerable = false;
        this.shipSprite.visible = true;
    },

    shipBlink: function () {
        this.shipSprite.visible = !this.shipSprite.visible;
    },

    endGame: function () {
        game.state.start(states.game);
    }
};

var game = new Phaser.Game(gameProperties.screenWidth, gameProperties.screenHeight, Phaser.AUTO, 'gameDiv');
game.state.add(states.game, gameState);
game.state.start(states.game);