// ゲーム設定
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 480;
canvas.height = 640;

// モード設定
let oniMode = false;

// 画像読み込み
const playerImage = new Image(); playerImage.src = 'idutu.png';
const enemyImage = new Image(); enemyImage.src = 'polka.png'; // 変更
const momoImage = new Image(); momoImage.src = 'momosuzu.png';
const shishiImage = new Image(); shishiImage.src = 'shishiro.png';
const yukiImage = new Image(); yukiImage.src = 'yukihana.png';
const zainImage = new Image(); zainImage.src = 'zain.png';
const playerBulletImage = new Image(); playerBulletImage.src = 'playerBullet.png';
const enemyBulletImage = new Image(); enemyBulletImage.src = 'enemyBullet.png';
const itemImage = new Image(); itemImage.src = 'item.png';
const bombImage = new Image(); bombImage.src = 'bomb.png'; // 追加
const bossImage = new Image(); bossImage.src = 'boss.png';
const backgroundImage = new Image(); backgroundImage.src = 'background.png';

// 音声読み込み
const bgm = new Audio('bgm.mp3');
const shotSE = new Audio('shot.mp3');
const explosionSE = new Audio('explosion.mp3'); // 変更
const itemSE = new Audio('item.mp3');
const bossSE = new Audio('boss.mp3');

// プレイヤー設定
let player = {
  x: canvas.width / 2 - 16,
  y: canvas.height - 60,
  width: 32,
  height: 32,
  speed: 5,
  hp: 3,
  lives: 5 // ノーマルモードの残機
};

let enemies = [];
let playerBullets = [];
let enemyBullets = [];
let items = [];
let keys = {};
let score = 0;
let boss = null;
let bossHP = 100;
let bossPhase = 1;
let bossSpeed = 2;
let lastShotTime = 0;
let invincible = false;
let invincibleTimer = 0;
let gameRunning = true; // ゲームが進行中かどうかを管理するフラグ

let assetsLoaded = 0;
const totalAssets = 12; // 変更
[playerImage, enemyImage, momoImage, shishiImage, yukiImage, zainImage, playerBulletImage, enemyBulletImage, itemImage, bombImage, bossImage, backgroundImage].forEach(img => {
  img.onload = () => {
    assetsLoaded++;
    if (assetsLoaded === totalAssets) {
      document.getElementById('startButton').disabled = false;
      document.getElementById('oniButton').disabled = false;
    }
  };
});

addEventListener('keydown', (e) => keys[e.key] = true);
addEventListener('keyup', (e) => keys[e.key] = false);

document.getElementById('startButton').addEventListener('click', () => {
  oniMode = false;
  startGame();
});

document.getElementById('oniButton').addEventListener('click', () => {
  oniMode = true;
  startGame();
});

document.getElementById('topButton').addEventListener('click', () => {
  location.reload();
});

function startGame() {
  document.getElementById('overlay').style.display = 'none';
  player.hp = oniMode ? 2 : 3;
  player.lives = oniMode ? 2 : 5; // モードに応じた残機設定
  bgm.loop = true;
  bgm.play();
  gameRunning = true;
  boss = null; // ボスをリセット
  score = 0; // スコアをリセット
  enemies = []; // 敵をリセット
  playerBullets = [];
  enemyBullets = [];
  items = [];
  gameLoop();
  setInterval(spawnEnemy, 1000);
  setInterval(spawnItem, 10000);
  setInterval(spawnBomb, 15000); // bombアイテムの出現
}

function spawnEnemy() {
  const types = ['momo', 'shishi', 'yuki', 'zain'];
  const type = types[Math.floor(Math.random() * types.length)];
  enemies.push({
    x: Math.random() * (canvas.width - 48), // サイズ変更
    y: -48, // サイズ変更
    width: 48, // サイズ変更
    height: 48, // サイズ変更
    type: type
  });
}

function spawnItem() {
  items.push({
    x: Math.random() * (canvas.width - 32),
    y: -32,
    width: 32,
    height: 32
  });
}

function spawnBomb() {
  items.push({
    x: Math.random() * (canvas.width - 32),
    y: -32,
    width: 32,
    height: 32,
    type: 'bomb' // bombアイテム
  });
}

function gameLoop() {
  if (gameRunning) {
    update();
    draw();
    requestAnimationFrame(gameLoop);
  }
}

function update() {
  if (keys['ArrowLeft'] && player.x > 0) player.x -= player.speed;
  if (keys['ArrowRight'] && player.x < canvas.width - player.width) player.x += player.speed;
  if (keys['ArrowUp'] && player.y > 0) player.y -= player.speed;
  if (keys['ArrowDown'] && player.y < canvas.height - player.height) player.y += player.speed;

  if (keys[' '] && Date.now() - lastShotTime > 250) {
    playerBullets.push({
      x: player.x + player.width / 2 - 4,
      y: player.y,
      width: 8,
      height: 16
    });
    shotSE.currentTime = 0;
    shotSE.play();
    lastShotTime = Date.now();
  }

  playerBullets.forEach(b => b.y -= 8);
  enemyBullets.forEach(b => {
    b.y += 4;
    if (b.wave) {
      b.time++;
      b.x += Math.sin(b.time / 5) * 2;
    }
  });

  enemies.forEach(e => {
    e.y += 2;
    if (e.type === 'shishi') e.x += Math.sin(Date.now() / 100) * 4;
    if (e.type === 'momo' && Math.random() < 0.5) fireEnemyBullet(e);
    if (e.type === 'yuki') fireWavyBullet(e);
  });

  items.forEach(i => i.y += 2);

  for (let i = playerBullets.length - 1; i >= 0; i--) {
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (collision(playerBullets[i], e)) {
        e.hp = (e.hp || (oniMode ? 2 : 1)) - 1;
        playerBullets.splice(i, 1);
        if (e.hp <= 0) {
          explosionSE.currentTime = 0;
          explosionSE.play();
          enemies.splice(j, 1);
          score += 100; // 倒した敵のポイントを100点に変更
        }
        break;
      }
    }
  }

  if (!invincible) {
    for (let b of enemyBullets) {
      if (collision(b, player)) {
        player.lives--; // 残機が減るように修正
        b.y = canvas.height + 1;
        invincible = true;
        invincibleTimer = 60;
        break;
      }
    }
  }

  if (invincible) {
    invincibleTimer--;
    if (invincibleTimer <= 0) invincible = false;
  }

  for (let i = items.length - 1; i >= 0; i--) {
    if (collision(items[i], player)) {
      if (items[i].type === 'bomb') {
        explosionSE.currentTime = 0;
        explosionSE.play();
        enemies.forEach(e => {
          explosionSE.play();
          enemies.splice(enemies.indexOf(e), 1);
        });
      } else {
        itemSE.currentTime = 0;
        itemSE.play();
        player.hp++;
        player.lives++; // アイテムを取ったら残機を1増やす
      }
      items.splice(i, 1);
    }
  }

  // ボスの出現タイミングを3000点に変更
  if (score >= 3000 && !boss) {
    bossSE.play();
    boss = {
      x: canvas.width / 2 - 64,
      y: -128,
      width: 128,
      height: 128
    };
    bossHP = oniMode ? 200 : 100;
    bossPhase = 1;
  }

  if (boss) {
    if (boss.y < 100) boss.y += bossSpeed / 2;
    else boss.x += Math.sin(Date.now() / 500) * bossSpeed;
    if (bossHP <= 50 && bossPhase === 1) {
      bossPhase = 2;
      bossSpeed += 1;
    }
    if (bossHP > 0) fireBossBullet();
  }

  for (let i = playerBullets.length - 1; i >= 0; i--) {
    if (boss && collision(playerBullets[i], boss)) {
      bossHP--;
      playerBullets.splice(i, 1);
      if (bossHP <= 0) {
        explosionSE.play();
        boss = null;
        score += 100;
        gameRunning = false; // ゲームを停止
        showClearMessage(); // ボスを倒したときのメッセージ
      }
    }
  }

  if (player.lives <= 0) {
    gameRunning = false; // ゲームを停止
    showGameOver();
  }

  playerBullets = playerBullets.filter(b => b.y + b.height > 0);
  enemyBullets = enemyBullets.filter(b => b.y < canvas.height);
  enemies = enemies.filter(e => e.y < canvas.height);
  items = items.filter(i => i.y < canvas.height);
}

function draw() {
  ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
  ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
  for (let enemy of enemies) {
    let img = enemyImage;
    if (enemy.type === 'momo') img = momoImage;
    else if (enemy.type === 'shishi') img = shishiImage;
    else if (enemy.type === 'yuki') img = yukiImage;
    else if (enemy.type === 'zain') img = zainImage;
    ctx.drawImage(img, enemy.x, enemy.y, enemy.width, enemy.height);
  }
  for (let bullet of playerBullets) {
    ctx.drawImage(playerBulletImage, bullet.x, bullet.y, bullet.width, bullet.height);
  }
  for (let bullet of enemyBullets) {
    ctx.drawImage(enemyBulletImage, bullet.x, bullet.y, bullet.width, bullet.height);
  }
  for (let item of items) {
    if (item.type === 'bomb') {
      ctx.drawImage(bombImage, item.x, item.y, item.width, item.height);
    } else {
      ctx.drawImage(itemImage, item.x, item.y, item.width, item.height);
    }
  }
  if (boss) {
    ctx.drawImage(bossImage, boss.x, boss.y, boss.width, boss.height);
    // ボスのHPバーを表示
    ctx.fillStyle = 'red';
    ctx.fillRect(boss.x, boss.y - 10, boss.width, 5);
    ctx.fillStyle = 'green';
    ctx.fillRect(boss.x, boss.y - 10, boss.width * (bossHP / 100), 5);
  }
  ctx.font = "16px sans-serif";
  ctx.fillStyle = 'white';
  ctx.fillText(`Score: ${score}`, 10, 20);
  ctx.fillText(`Lives: ${player.lives}`, 10, 40); // 残機表示
}

function showGameOver() {
  // ゲームオーバー時に画面上に表示
  document.getElementById('message').innerText = 'どんまい';
  document.getElementById('message').style.color = 'red';
  document.getElementById('topButton').style.display = 'block';
  document.getElementById('overlay').style.display = 'flex'; // 追加
  bgm.pause();
}

function showClearMessage() {
  // ボスを倒したときに画面上に表示
  document.getElementById('message').innerText = 'あんたが伝説！';
  document.getElementById('message').style.color = 'gold';
  document.getElementById('topButton').style.display = 'block';
  document.getElementById('overlay').style.display = 'flex'; // 追加
  bgm.pause();
}

function collision(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
    a.y < b.y + b.height && a.y + a.height > b.y;
}

function fireBossBullet() {
  const rate = oniMode ? 0.2 : 0.05;
  if (Math.random() < rate) {
    enemyBullets.push({
      x: boss.x + boss.width / 2 - 4,
      y: boss.y + boss.height,
      width: 8,
      height: 16
    });
  }
}

function fireEnemyBullet(enemy) {
  enemyBullets.push({
    x: enemy.x + enemy.width / 2 - 4,
    y: enemy.y + enemy.height,
    width: 8,
    height: 16
  });
}

function fireWavyBullet(enemy) {
  if (Math.random() < 0.05) {
    enemyBullets.push({
      x: enemy.x + enemy.width / 2 - 4,
      y: enemy.y + enemy.height,
      width: 8,
      height: 16,
      wave: true,
      time: 0
    });
  }
}
