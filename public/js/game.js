// The game properties object that currently only contains the screen dimensions
var gameProperties = {
    screenWidth: 640,
    screenHeight: 480,

    paddleLeft_x: 50,
    paddleVelocity: 600
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

    asteroidLarge: { minVelocity: 50, maxVelocity: 150, minAngularVelocity: 0, maxAngularVelocity: 200, score: 20, nextSize: graphicAssets.asteroidMedium.name, pieces: 2 },
    asteroidMedium: { minVelocity: 50, maxVelocity: 200, minAngularVelocity: 0, maxAngularVelocity: 200, score: 50}
};

var mainState = function(game) {
    this.paddleLeftSprite;
    this.paddleLeft_up;
    this.paddleLeft_down;
    this.paddleLeft_fire;

    this.paddeGroup;
    this.bulletGroup;
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
        this.initGraphics();
        this.initPhysics();
        this.initKeyboard();
        this.resetAsteroids();
    },

    update: function () {
        this.asteroidGroup.forEachExists(this.checkBoundaries, this);
        this.moveLeftPaddle();
        this.fire();

        game.physics.arcade.overlap(this.bulletGroup, this.asteroidGroup, this.asteroidCollision, null, this);
        game.physics.arcade.overlap(this.paddleLeftSprite, this.asteroidGroup, this.asteroidCollision, null, this);
    },

    initPhysics: function() {
        this.paddleGroup = game.add.group();
        this.paddleGroup.enableBody = true;
        this.paddleGroup.physicsBodyType = Phaser.Physics.ARCADE;

        this.paddleGroup.add(this.paddleLeftSprite);

        this.paddleGroup.setAll('checkWorldBounds', true);
        this.paddleGroup.setAll('body.collideWorldBounds', true);
        this.paddleGroup.setAll('body.immovable', true);

        this.bulletGroup = game.add.group();
        this.bulletGroup.enableBody = true;
        this.bulletGroup.physicsBodyType = Phaser.Physics.ARCADE;
        this.bulletGroup.createMultiple(30, graphicAssets.bullet.name);

        this.asteroidGroup = game.add.group();
        this.asteroidGroup.enableBody = true;
        this.asteroidGroup.physicsBodyType = Phaser.Physics.ARCADE;
    },

    initGraphics: function() {
        this.paddleLeftSprite = game.add.sprite(gameProperties.paddleLeft_x, game.world.centerY, graphicAssets.paddle.name);
        this.paddleLeftSprite.anchor.set(0.5, 0.5);
    },

    initKeyboard: function() {
        this.paddleLeft_up = game.input.keyboard.addKey(Phaser.Keyboard.UP);
        this.paddleLeft_down = game.input.keyboard.addKey(Phaser.Keyboard.DOWN);
        this.paddleLeft_fire = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
    },

    moveLeftPaddle: function() {
        if (this.paddleLeft_up.isDown) {
            this.paddleLeftSprite.body.velocity.y = -gameProperties.paddleVelocity;
        }
        else if (this.paddleLeft_down.isDown) {
            this.paddleLeftSprite.body.velocity.y = gameProperties.paddleVelocity;
        } else {
            this.paddleLeftSprite.body.velocity.y = 0;
        }
    },

    fire: function() {
        if(this.paddleLeft_fire.isDown){
            var bullet = this.bulletGroup.getFirstExists(false);

            if(bullet) {
                bullet.reset(this.paddleLeftSprite.x + 8, this.paddleLeftSprite.y);
                bullet.body.velocity.x = 400;
                bullet.lifespan = bulletProperties.lifeSpan;
            }
        }
    },

    createAsteroid: function (x, y, size, pieces) {
        if(pieces === undefined) {
            pieces = 1;
        }
        for(var i=0; i < pieces; i++) {
            var asteroid = this.asteroidGroup.create(x, y, size);
            asteroid.reset(x, y);
            asteroid.body.velocity.x = -200;
        }
    },

    resetAsteroids: function () {
        for (var i=0; i < this.asteroidsCount; i++ ) {
            var x;
            var y;

            x = gameProperties.screenWidth;
            y = Math.random() * game.world.centerY;

            this.createAsteroid(x, y, graphicAssets.asteroidLarge.name);
        }
    },

    asteroidCollision: function(target, asteroid) {
        target.kill();
        asteroid.kill();
        this.splitAsteroid(asteroid);
    },

    splitAsteroid: function (asteroid) {
        if (asteroidProperties[asteroid.key].nextSize) {
            this.createAsteroid(gameProperties.screenWidth, Math.random() * gameProperties.screenHeight, asteroidProperties[asteroid.key].nextSize, asteroidProperties[asteroid.key].pieces);
        }

        if(!this.asteroidGroup.countLiving()) {
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
    }

};

var game = new Phaser.Game(gameProperties.screenWidth, gameProperties.screenHeight, Phaser.AUTO, 'gameDiv');
game.state.add('main', mainState);
game.state.start('main');