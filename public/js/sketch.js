import Player from './classes/Player.js';
import socket from './socket.js';
import HitMarker from './classes/Hitmarker.js';
import Killfeed from './classes/Killfeed.js';
import Leaderboard from './classes/Leaderboard.js';
import WinnerLocation from './classes/WinnerLocation.js';
import XpBar from "./classes/XpBar.js";
import Minimap from "./classes/Minimap.js";
import MuteButton from "./classes/MuteButton.js";

import SpeedLevelOption from "./LevelOptions/SpeedLevelOption.js";
import DamageLevelOption from "./LevelOptions/DamageLevelOption.js";
import RegenLevelOption from "./LevelOptions/RegenLevelOption.js";
import BulletSpeedLevelOption from "./LevelOptions/BulletSpeedLevelOption.js";
import parallaxScrolling from "./Display/parallaxScrolling.js";
import drawAsteroids from "./Display/drawAsteroids.js";
import displayCurrentWinnerLocation from "./Display/displayCurrentWinnerLocation.js";
import displayFramesPerSecond from "./Display/displayFramesPerSecond.js";
import drawXAndY from "./Display/drawXAndY.js";
import drawXpGems from "./Display/drawXpGems.js";
import drawFood from "./Display/drawFood.js";
import drawBullets from "./Display/drawBullets.js";
import drawPopups from "./Display/drawPopups.js";
import {IS_DEBUG_MODE} from "./Constants.js";
import drawMessages from "./Display/drawMessages.js";

import {
  createXpGems,
  displayIncreasedShieldMessage,
  isWithinScreenXAndY,
  playerDisconnected,
  processHitmarker,
  processKillFeedAddition,
  processRespawn,
  removeBullet,
  removeXpGem,
  updateAsteroids,
  updateBullets,
  updateFoods,
  updateOtherPlayers,
  updateMessages,
  updateBosses

} from './gameLogic.js'
import {PLAYAREA_WIDTH, PLAYAREA_HEIGHT} from "./Constants.js";

let player;
let food = [];
let asteroids = [];
let asteroidImages = [];
let bullets = [];
let otherPlayers = [];
let button, input;
let gameStarted = false;
let leaders = [];
let canvas;
let xpGems = [];
let popups = [];
let hitMarker;
let hitMarkerImage;
let hitMarkerSound;
let shotSound;
let explosionSound;
let killfeed;
let leaderboard;
let winnerLocation;
let indicatorImage;
let foodImage;

let spaceShipImage;
let winnerSpaceShipImage;
let leaderBoardWinnersId;
let minimap;
let soundOn;
let soundOff;
let muteButton;
let space;
let gemImage;

let playerLevelUpPoints = 0;
let xpBar;

let speedImage;
let damageImage;
let regenImage;
let bulletSpeedImage;
let transparentDamageImage;
let transparentSpeedImage;
let transparentRegenImage;
let transparentBulletSpeedImage;

let speedOption;
let damageOption;
let regenOption;
let bulletSpeedOption;

let isInvalidUsername = false;
let invalidUsername;
let invalidUsernameLabel;

let messageInput;
let messages = [];

let bosses = [];
let bossImage;

socket.on('foods', data => updateFoods(data, food, foodImage));
socket.on('asteroids', data => updateAsteroids(data, asteroids, asteroidImages));

socket.on('createXpGem', gems => xpGems.push(...createXpGems(gems, gemImage)));
socket.on('removeXpGem', gemId => removeXpGem(gemId, xpGems, popups));

let stars = [];

function loadImages() {
  hitMarkerImage = loadImage("assets/images/hitmarker.png");
  indicatorImage = loadImage("assets/images/indicator.png");

  spaceShipImage = loadImage("assets/images/playerShip.png");
  winnerSpaceShipImage = loadImage("assets/images/playerShip.png");

  //
  // spaceShipImage = loadImage("assets/images/bronzeSpaceship.png");
  // winnerSpaceShipImage = loadImage("assets/images/goldSpaceship.png");
  foodImage = loadImage("assets/images/food.png", foodImageLoaded);
  soundOn = loadImage("assets/images/soundOn.png");
  soundOff = loadImage("assets/images/soundOff.png");
  gemImage = loadImage("assets/images/gem.png");
  space = [loadImage("assets/images/space.png"), loadImage("assets/images/space2.png"), loadImage("assets/images/space3.png")];

  speedImage = loadImage("assets/images/speed.png");
  damageImage = loadImage("assets/images/damage.png");
  regenImage = loadImage("assets/images/regen.png");
  bulletSpeedImage = loadImage("assets/images/bulletSpeed.png");

  transparentDamageImage = loadImage("assets/images/damageTransparent.png");
  transparentRegenImage = loadImage("assets/images/regenTransparent.png");
  transparentSpeedImage = loadImage("assets/images/speedTransparent.png");
  transparentBulletSpeedImage = loadImage("assets/images/bulletSpeedTransparent.png");

  bossImage = loadImage("assets/images/redship.png");

  loadAsteroidImages();
}

function loadAsteroidImages() {

  let asteroidGreyImage = loadImage("assets/images/asteroidGrey.png");
  let asteroidGreyImage1 = loadImage("assets/images/asteroidGrey1.png");
  let asteroidGreyImage2 = loadImage("assets/images/asteroidGrey2.png");
  let asteroidOrangeImage = loadImage("assets/images/asteroidOrange.png");
  asteroidImages.push(asteroidGreyImage, asteroidGreyImage1, asteroidGreyImage2, asteroidOrangeImage);
  asteroidImageLoaded();
}

function foodImageLoaded() {
  socket.emit("sendAllFood");
}

function asteroidImageLoaded() {
  socket.emit("sendAllAsteroids");
}

function loadSounds() {
  shotSound = new Howl({
    src: ['assets/sounds/shot.wav'],
    volume: 0.05

  });

  explosionSound = new Howl({
    src: ['assets/sounds/explode1.wav'],
    volume: 0.2
  });
  hitMarkerSound = new Howl({
    src: ['assets/sounds/hitmarker.mp3'],
    volume: 0.5
  });
}

window.setup = function () {
  clear();

  canvas = createCanvas(window.innerWidth, window.innerHeight);

  for (let i = 0; i < 1000; i++) {
    stars[i] = {x: random(PLAYAREA_WIDTH), y: random(PLAYAREA_HEIGHT), speed: random(0, 1), moveRate: random(500)};
  }
  if (isInvalidUsername) {
    //bugfix: if three or more invalidUsername attempts happen, text will be shown correctly
    if(invalidUsernameLabel){
      invalidUsernameLabel.remove();
    }
    button.remove();
    input.remove();
    invalidUsernameLabel = createElement('h2', `Username ${invalidUsername} already taken`);
    invalidUsernameLabel.position(window.innerWidth / 2 - 250, window.innerHeight / 2 - 80);
    let colour = color(255, 23, 32);

    invalidUsernameLabel.style('color', colour);
  }

  input = createInput().attribute('placeholder', 'username');
  input.class('username');
  input.position(window.innerWidth / 2 - 250, window.innerHeight / 2);

  button = createButton("Play");
  button.position(window.innerWidth / 2 - 250, window.innerHeight / 2 + 80);
  button.mousePressed(function () {

    let inputValue = input.value().replace(/[^\x00-\x7F]/g, "");
    if (inputValue.length >= 2 && inputValue.length < 15) {
      if (invalidUsernameLabel) {
        invalidUsernameLabel.remove();
      }
      button.remove();
      input.remove();
      player = new Player(inputValue, spaceShipImage, winnerSpaceShipImage);
      hitMarker = new HitMarker();
      killfeed = new Killfeed();
      leaderboard = new Leaderboard(player, leaders);
      winnerLocation = new WinnerLocation(indicatorImage);
      minimap = new Minimap();
      muteButton = new MuteButton(soundOn, soundOff);
      speedOption = new SpeedLevelOption(speedImage, transparentSpeedImage );
      damageOption = new DamageLevelOption(damageImage, transparentDamageImage);
      regenOption = new RegenLevelOption(regenImage, transparentRegenImage);
      bulletSpeedOption =  new BulletSpeedLevelOption(bulletSpeedImage, transparentBulletSpeedImage);

      xpBar = new XpBar();

      let playerPosition = {
        x: player.pos.x,
        y: player.pos.y,
        angle: player.radians,
        name: player.name
      };
      socket.emit('player', playerPosition);
      gameStarted = true;
      createMessageInput();
    }
  });


  socket.on('playerDisconnected', id => playerDisconnected(id, otherPlayers));
  socket.on('heartbeat', data => updateOtherPlayers(data, player, otherPlayers));
  socket.on('bullets', data => updateBullets(data, bullets));
  socket.on('bulletHit', bullet => removeBullet(bullet, bullets));
  socket.on('leaderboard', leaderboard => leaders = leaderboard);
  socket.on('increaseShield', data => displayIncreasedShieldMessage(data, popups, player));
  socket.on('respawn-start', timeOut => processRespawn(player, popups, timeOut));
  socket.on('respawn-end', () => player.respawning = false);
  socket.on('playExplosion', () => {
    if (!muteButton.isMuted) {
      explosionSound.play()
    }
  });
  socket.on('hitMarker', player => hitMarker = processHitmarker(player, hitMarkerImage, hitMarkerSound, muteButton.isMuted));
  socket.on('killfeed', data => processKillFeedAddition(data, killfeed));
  socket.on('processShotSound', () => {
    if (!muteButton.isMuted) {
      // shotSound.play();
    }
  });

  socket.on('leveledUp', () => playerLevelUpPoints += 1);
  socket.on('invalidUsername', userEnteredInvalidUsername);
  socket.on('chat', serverMessage => updateMessages(serverMessage, messages));
  socket.on('boss', updatedBosses => updateBosses(updatedBosses, bosses, bossImage));

  loadSounds();
  loadImages();


};

function userEnteredInvalidUsername(data) {
  gameStarted = false;
  isInvalidUsername = true;
  invalidUsername = data;
  window.setup();
}


window.draw = function () {
  background(0);
  fill(255);
  scale(1);
  textSize(15);
  if (gameStarted && player) {
    parallaxScrolling(player.x, player.y, space);
    translate(width / 2 - player.pos.x, height / 2 - player.pos.y);

    drawBullets(bullets, player);
    player.display(leaders);
    drawPopups(popups);
    drawFood(player, food);
    drawOtherPlayers(player, leaderBoardWinnersId);
    leaderboard.updateLeaderboard(player, leaders);
    displayCurrentWinnerLocation(otherPlayers, player, winnerLocation, leaderboard);

    if (mouseIsPressed && mouseButton === LEFT) {
      processPlayerShooting();
    }

    drawAsteroids(asteroids, player);

    drawXpGems(player, xpGems);


    drawBosses();
    minimap.displayMinimap(player.pos.x, player.pos.y, player.radians, food);
    muteButton.displayMuteButton(player.pos.x - width / 2, player.pos.y - height / 2);


    hitMarker.display();
    killfeed.displayKillfeed(player.pos, spaceShipImage, winnerSpaceShipImage);
    leaderboard.displayLeaderboard();

    xpBar.display(player);

    drawLevelUpButtons();
    socket.emit('angle', player.radians);
    clientLogging();
    drawMessages(messages, player.pos.x, player.pos.y);
    drawXAndY(player.pos.x, player.pos.y);
    displayFramesPerSecond(player.pos.x, player.pos.y);
  } else {
    drawStartScreen();
  }
};


function drawLevelUpButtons() {

  let middleX = player.pos.x - width / 2;
  let middleY = player.pos.y - height / 2;
  speedOption.display(middleX, middleY, playerLevelUpPoints, player.additionalSpeed);
  damageOption.display(middleX, middleY, playerLevelUpPoints, player.damage);
  regenOption.display(middleX, middleY, playerLevelUpPoints, player.regen);
  bulletSpeedOption.display(middleX, middleY, playerLevelUpPoints, player.bulletSpeed);


  if (playerLevelUpPoints > 0) {
    middleY = middleY + windowHeight / 3.4 + height / 2;
    middleX = middleX + windowWidth / 2;

    push();
    fill(0, 255, 0);
    text(`Points available ${playerLevelUpPoints}`, middleX, middleY + 80);
    pop();
  }


}



function drawStartScreen() {
  let position = {
    x: 1000,
    y: 500
  };
  parallaxScrolling(position.x, position.y, space);
  // drawFood(position);
  drawOtherPlayers(position);

}


function drawOtherPlayers(currentPosition) {
  for (const otherPlayer of otherPlayers) {
    if (isWithinScreenXAndY(currentPosition, otherPlayer.x, otherPlayer.y)) {
      if (leaders.length > 0) {
        leaderBoardWinnersId = leaders[0].id;
      }
      otherPlayer.draw(leaderBoardWinnersId, spaceShipImage, winnerSpaceShipImage);
    }
  }
}

function createMessageInput() {

  messageInput = createInput().attribute('placeholder', 'message');
  messageInput.class('messageInput');
  messageInput.position(window.innerWidth / 1.2, window.innerHeight - 100);
}


window.oncontextmenu = function (e) {
  e.preventDefault();
};


window.keyPressed = function () {
  if (gameStarted) {
    if (keyCode === UP_ARROW || keyCode === 87) {
      socket.emit('keyPressed', "isMoving");
    } else if (keyCode === 13) {
      processMessage();
    }
  }
};

function processMessage() {
  if (messageInput.value() !== "" && messageInput.value().length < 30) {
    socket.emit('chat', messageInput.value())
    messageInput.value('');
  }
}

window.keyReleased = function () {
  if (gameStarted) {
    if (keyCode === UP_ARROW || keyCode === 87) {
      socket.emit('keyReleased', "isMoving");
    }
  }
};

window.onresize = function () {
  background(0);
  canvas.size(window.innerWidth, window.innerHeight);
  input.position(window.innerWidth / 2 - 250, window.innerHeight / 2);
  button.position(window.innerWidth / 2 - 250, window.innerHeight / 2 + 80);
  messageInput.position(window.innerWidth / 1.2, window.innerHeight - 100);
  if (invalidUsernameLabel) {
    invalidUsernameLabel.position(window.innerWidth / 2 - 250, window.innerHeight / 2 - 80);
  }
};

window.mousePressed = function () {
  if (mouseButton === LEFT) {
    checkMuteToggled();
    processPlayerShooting();
    checkIfPlayerHasChosenALevelOption();
  }
};

function processPlayerShooting() {
  if (gameStarted) {
    socket.emit('bullet');
  }
}

function checkMuteToggled() {
  if (muteButton) {
    muteButton.checkIfClicked(mouseX, mouseY);
  }
}

function checkIfPlayerHasChosenALevelOption() {
  if (playerLevelUpPoints > 0) {
    if (speedOption.hasPlayerClickedOption(mouseX, mouseY)) {
      playerLevelUpPoints -= 1;
      socket.emit('lvlUp', "speed");
    } else if (damageOption.hasPlayerClickedOption(mouseX, mouseY)) {
      playerLevelUpPoints -= 1;
      socket.emit('lvlUp', "damage");
    } else if (regenOption.hasPlayerClickedOption(mouseX, mouseY)) {
      playerLevelUpPoints -= 1;
      socket.emit('lvlUp', "regen");
    } else if (bulletSpeedOption.hasPlayerClickedOption(mouseX, mouseY)) {
      playerLevelUpPoints -= 1;
      socket.emit('lvlUp', "bulletSpeed");
    }
  }
}

function clientLogging() {
  if (IS_DEBUG_MODE && frameCount % 300 === 0) {
    console.log("*******************************");
    console.log("Asteroids " + asteroids.length);
    console.log("XpGems " + xpGems.length);
    console.log("Popups " + popups.length);
    console.log("players " + otherPlayers.length);
    console.log("foods " + food.length);
    console.log("asteroids  " + asteroids.length);
    console.log("bullets  " + bullets.length);
    console.log("Power Up Points " + playerLevelUpPoints);

    let totalParticles = 0;
    for (let asteroid of asteroids) {
      totalParticles += asteroid.particles.length;
    }
    console.log("Number of particles " + totalParticles);
  }
}



window.mouseWheel = function (event) {
  return false;
};


function drawBosses() {
  for (let boss of bosses) {
    boss.draw();
  }
}


