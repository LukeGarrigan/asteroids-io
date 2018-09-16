let express = require('express');
let app = express();


let server = app.listen(4000);

app.use(express.static('public'));

console.log("Server is now running");


let socket = require('socket.io');

let io = socket(server);


let playersLastShot = [];
let playerShields = [];

let players = [];
let bullets = [];
let foods = [];
let leaderboard = [];


let lastBulletId = 0;

const MAX_SHIELD = 1000;
const NUM_FOOD = 400;
setupFood();

function setupFood() {

  for (let i = 0; i < NUM_FOOD; i++) {
    let foodX = Math.floor(Math.random() * (1920 * 3)) + 1;
    let foodY = Math.floor(Math.random() * (1080 * 3)) + 1;
    let foodRadius = Math.floor(Math.random() * 22) + 1;

    let food = {
      x: foodX,
      y: foodY,
      r: foodRadius,
      id: i
    };
    foods.push(food);
  }
}

setInterval(broadcastPlayers, 16);

function broadcastPlayers() {
  for (let i = 0; i < players.length; i++) {
    updatePlayerPosition(players[i]);
  }

  io.sockets.emit('leaderboard', leaderboard);
  io.sockets.emit('heartbeat', players);
  io.sockets.emit('bullets', bullets);

}



function updatePlayerPosition(player) {

  if (player.shield < 0) {
    player.x = Math.floor(Math.random() * 1920) + 1;
    player.y = Math.floor(Math.random() * 1080) + 1;
    player.shield = 100;
    player.score = 0;
    updateLeaderboard();
    io.to(player.id).emit('playExplosion');

  } else if (player.shield > MAX_SHIELD) {
    player.shield = MAX_SHIELD;
  }

  if (player.isUp) {
    if (player.isBoosting && player.shield > 0) {
      player.y -= 5;
    } else {
      player.y -= 2;
    }
  }
  if (player.isDown) {
    if (player.isBoosting && player.shield > 0) {
      player.y += 5;
    } else {
      player.y += 2;
    }
  }

  if (player.isLeft) {
    if (player.isBoosting && player.shield > 0) {
      player.x -= 5;
    } else {
      player.x -= 2;
    }
  }

  if (player.isRight) {
    if (player.isBoosting && player.shield > 0) {
      player.x += 5;
    } else {
      player.x += 2;
    }
  }

  if (player.isBoosting && player.shield > 0) {
    player.shield--;
    io.to(player.id).emit('increaseShield', -1);
  }


  // constrain - so moving to the edge of the screen
  if (player.x < 0) {
    player.x = 1920 * 3;
  } else if (player.x > 1920 * 3) {
    player.x = 0;
  }

  if (player.y < 0) {
    player.y = 1080 * 3;
  } else if (player.y > 1080 * 3) {
    player.y = 0;
  }
  updatePlayerEatingFood(player);
  updatePlayerGettingShot(player);
}

function updatePlayerEatingFood(player) {
  for (let i = 0; i < foods.length; i++) {
    if (Math.abs(foods[i].x - player.x) + Math.abs(foods[i].y - player.y) < 21 + foods[i].r) {
      player.shield += foods[i].r;
      io.to(player.id).emit('increaseShield', foods[i].r);
      let foodX = Math.floor(Math.random() * (1920 * 3)) + 1;
      let foodY = Math.floor(Math.random() * (1080 * 3)) + 1;
      foods[i].x = foodX;
      foods[i].y = foodY;

      io.sockets.emit('foods', foods);
    }
  }
}

function updatePlayerGettingShot(player) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    if (player.id !== bullets[i].clientId) {
      if (Math.abs(bullets[i].x - player.x) + Math.abs(bullets[i].y - player.y) < 21 + 10) {
        io.sockets.emit('bulletHit', bullets[i].id);
        console.log(player.shield);
        player.shield -= 75;
        io.to(player.id).emit('increaseShield', -75);

        let isCurrentPlayerWinning = checkIfCurrentPlayerIsWinning(player.id);

        if (player.shield <= 0) {
          updatePlayerScore(bullets[i].clientId, isCurrentPlayerWinning, player.score);
          player.score = 0;
          io.to(player.id).emit('playExplosion');
          io.to(bullets[i].clientId).emit('playExplosion');
        }
        bullets.splice(i, 1);
      }
    }
  }
}

function updatePlayerScore(id, isCurrentPlayerWinning, score) {
  for (let i = 0; i < players.length; i++) {
    if (players[i].id == id) {
      console.log("Increasing players score!!!");
      players[i].score++;
      if (isCurrentPlayerWinning) {
        let scoreIncrease = score * 100;
        scoreIncrease = score == 0 ? 50 : score;
        io.to(id).emit('increaseShield', scoreIncrease);
        players[i].shield += scoreIncrease;
      } else {
        let scoreIncrease = score * 10;
        io.to(id).emit('increaseShield', scoreIncrease);
        players[i].shield += scoreIncrease;
      }

      if (players[i].shield > MAX_SHIELD) {
        player.shield = MAX_SHIELD;
      }
    }
  }
}

function checkIfCurrentPlayerIsWinning(id) {

  if (leaderboard.length > 0) {
    if (id == leaderboard[0].id) {
      return true;
    }
  }
  return false;


}

io.sockets.on('connection', function newConnection(socket) {
  console.log("new connection " + socket.id);
  setupPlayerLastShot(socket);

  socket.emit('foods', foods);

  socket.on('player', function playerMessage(playerData) {
    playerData.id = socket.id;
    playerData.shield = 100;
    playerData.isUp = false;
    playerData.isDown = false;
    playerData.isLeft = false;
    playerData.isRight = false;
    playerData.isBoosting = false;
    playerData.r = 21;
    playerData.score = 0;

    let playersName = playerData.name.substring(0, 15);
    playerData.name = playersName.replace(/[^\x00-\x7F]/g, "");;
    players.push(playerData);

    addNewPlayerToLeaderboard(playerData);
  });

  socket.on('bullet', function () {
    for (let i = players.length - 1; i >= 0; i--) {
      if (players[i].id == socket.id) {
        processPlayerShooting(players[i], socket);
      }
    }
  });


  socket.on('disconnect', function () {
    console.log("Player disconnected");

    for (let i = players.length - 1; i >= 0; i--) {
      if (players[i].id == socket.id) {
        players.splice(i, 1);
      }
    }

    for (let i = leaderboard.length - 1; i >= 0; i--) {
      if (leaderboard[i].id == socket.id) {
        leaderboard.splice(i, 1);
      }
    }
    socket.broadcast.emit('playerDisconnected', socket.id);
  });

  socket.on('keyPressed', function (direction) {
    for (let i = 0; i < players.length; i++) {
      if (socket.id == players[i].id) {
        if (direction == "up") {
          players[i].isUp = true;
        } else if (direction == "down") {
          players[i].isDown = true;
        } else if (direction == "left") {
          players[i].isLeft = true;
        } else if (direction == "right") {
          players[i].isRight = true;
        } else if (direction == "spacebar") {
          players[i].isBoosting = true;
        }
      }
    }
  });

  socket.on('keyReleased', function (direction) {
    for (let i = 0; i < players.length; i++) {
      if (socket.id == players[i].id) {
        if (direction == "up") {
          players[i].isUp = false;
        } else if (direction == "down") {
          players[i].isDown = false;
        } else if (direction == "left") {
          players[i].isLeft = false;
        } else if (direction == "right") {
          players[i].isRight = false;
        } else if (direction == "spacebar") {

          players[i].isBoosting = false;
        }
      }
    }
  });

  socket.on('angle', function (angle) {
    for (let i = 0; i < players.length; i++) {
      if (socket.id == players[i].id) {
        players[i].angle = angle;
      }
    }
  });


  socket.on('reduceShield', function () {
    for (let i = 0; i < players.length; i++) {
      if (socket.id == players[i].id) {
        players[i].shield -= 75;
      }
    }
  });


  socket.on('playerBullets', function (myBullets) {
    for (let i = 0; i < myBullets.length; i++) {
      for (let j = 0; j < bullets.length; j++) {
        if (myBullets[i].id == bullets[j].id) {
          bullets[j].x = myBullets[i].x;
          bullets[j].y = myBullets[i].y;
        }
      }
    }
  });
  socket.on('playerDestruction', function() {
    console.log("Player Destruction fired")
    sounds.playSound(explosionSound)
  });
});

function setupPlayerLastShot(socket) {
  let playerLastShot = {
    id: socket.id,
    date: Date.now()
  }
  playersLastShot.push(playerLastShot);
}

function processPlayerShooting(player, socket) {
  for (let i = 0; i < playersLastShot.length; i++) {
    if (playersLastShot[i].id == socket.id) {
      let previousShot = playersLastShot[i].date;
      let timeSinceLastShot = Date.now() - previousShot;
      if (timeSinceLastShot > 200) {
        playersLastShot[i].date = Date.now();

        lastBulletId = lastBulletId + 1;
        let bullet = {
          x: player.x,
          y: player.y,
          angle: player.angle,
          id: lastBulletId,
          clientId: player.id
        };
        bullets.push(bullet);
      }
    }
  }
}

function updateLeaderboard() {
  for (let i = 0; i < leaderboard.length; i++) {
    for (let j = 0; j < players.length; j++) {
      if (leaderboard[i].id == players[j].id) {
        leaderboard[i].score = players[j].score;
      }
    }
  }

  console.log("sorting");
  leaderboard.sort(function (a, b) {
    return a.score < b.score;
  });
}

function addNewPlayerToLeaderboard(playerData) {
  let player = {
    id: playerData.id,
    name: playerData.name,
    score: playerData.score
  };

  leaderboard.push(player);
}
