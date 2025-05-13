// ゲーム設定
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 480;
canvas.height = 640;

// モード設定
let oniMode = false;

// 画像読み込み
const playerImage = new Image(); playerImage.src = 'idutu.png';
const enemyImage = new Image(); enemyImage.src = 'polka.jpg';
const momoImage = new Image(); momoImage.src = 'momosuzu.png';
const shishiImage = new Image(); shishiImage.src = 'shishiro.png';
const yukiImage = new Image(); yukiImage.src = 'yukihana.png';
const zainImage = new Image(); zainImage.src = 'zain.png';
const playerBulletImage = new Image(); playerBulletImage.src = 'playerBullet.png';
const enemyBulletImage = new Image(); enemyBulletImage.src = 'enemyBullet.png';
const itemImage = new Image(); itemImage.src = 'item.png';
const bossImage = new Image(); bossImage.src = 'boss.png';
const backgroundImage = new Image(); backgroundImage.src = 'background.png';

// 音声読み込み
const bgm = new Audio('bgm.mp3');
const shotSE = new Audio('shot.mp3');
const explosionSE = new Audio('explosion.mp3');
const itemSE = new Audio('item.mp3');
const bossSE = new Audio('boss.mp3');

let player = {
  x: canvas.width / 2 - 16,
  y: canvas.height - 60,
  width: 32,
  height: 32,
  speed: 5,
  hp: 3
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
let bossCount = 0;
let lastShotTime = 0;

// イベントリスナー
document.addEventListener('keydown', (e) => keys[e.key] = true);
document.addEventListener('keyup', (e) => keys[e.key] = false);

// スタート（通常モード）
document.getElementById('startButton').addEventListener('click', () => {
  document.getElementById('startButton').style.display = 'none';
  document.getElementById('oniButton').style.display = 'none';
  document.getElementById('gameTitle').style.display = 'none';
  player.hp = 3;
  bgm.loop = true;
  bgm.play();
  gameLoop();
});

// 鬼モード開始ボタン
document.getElementById('oniButton').addEventListener('click', () => {
  oniMode = true;
  player.hp = 2;
  document.getElementById('startButton').click(); // 通常スタート処理を流用
});

// TOPボタンで再読み込み
document.getElementById('topButton').addEventListener('click', () => {
  location.reload();
});

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
    ctx.drawImage(itemImage, item.x, item.y, item.width, item.height);
  }
  if (boss) {
    ctx.drawImage(bossImage, boss.x, boss.y, boss.width, boss.height);
  }
  ctx.fillStyle = 'white';
  ctx.fillText(`Score: ${score}`, 10, 20);
  ctx.fillText(`HP: ${player.hp}`, 10, 40);
}

function update() {
  if (keys['ArrowLeft'] && player.x > 0) player.x -= player.speed;
  if (keys['ArrowRight'] && player.x < canvas.width - player.width) player.x += player.speed;
  if (keys['ArrowUp'] && player.y > 0) player.y -= player.speed;
  if (keys['ArrowDown'] && player.y < canvas.height - player.height) player.y += player.speed;

  // スペースでショット
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

  for (let bullet of playerBullets) bullet.y -= 8;
  for (let bullet of enemyBullets) {
    bullet.y += 4;
    if (bullet.wave) {
      bullet.time++;
      bullet.x += Math.sin(bullet.time / 5) * 2;
    }
  }

  for (let enemy of enemies) {
    enemy.y += 2;
    if (enemy.type === 'shishi') enemy.x += Math.sin(Date.now() / 100) * 4;
    if (enemy.type === 'momo' && Math.random() < 0.5) fireEnemyBullet(enemy);
    if (enemy.type === 'yuki') fireWavyBullet(enemy);
  }

  for (let item of items) item.y += 2;

  for (let i = playerBullets.length - 1; i >= 0; i--) {
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (
        playerBullets[i].x < e.x + e.width &&
        playerBullets[i].x + playerBullets[i].width > e.x &&
        playerBullets[i].y < e.y + e.height &&
        playerBullets[i].y + playerBullets[i].height > e.y
      ) {
        e.hp = (e.hp || (oniMode ? 2 : 1)) - 1;
        playerBullets.splice(i, 1);
        if (e.hp <= 0) {
          explosionSE.currentTime = 0;
          explosionSE.play();
          enemies.splice(j, 1);
          score += 10;
        }
        break;
      }
    }
  }

  for (let bullet of enemyBullets) {
    if (
      bullet.x < player.x + player.width &&
      bullet.x + bullet.width > player.x &&
      bullet.y < player.y + player.height &&
      bullet.y + bullet.height > player.y
    ) {
      player.hp--;
      bullet.y = canvas.height + 1;
    }
  }

  for (let i = items.length - 1; i >= 0; i--) {
    if (
      items[i].x < player.x + player.width &&
      items[i].x + items[i].width > player.x &&
      items[i].y < player.y + player.height &&
      items[i].y + items[i].height > player.y
    ) {
      itemSE.currentTime = 0;
      itemSE.play();
      player.hp++;
      items.splice(i, 1);
    }
  }

  if ((oniMode ? score >= 100 * (bossCount + 1) : score >= 100 && !boss)) {
    bossSE.play();
    boss = {
      x: canvas.width / 2 - 64,
      y: -128,
      width: 128,
      height: 128
    };
    bossHP = oniMode && bossCount === 1 ? 200 : 100;
    bossCount++;
  }

  if (boss) {
    if (boss.y < 100) boss.y += bossSpeed / 2;
    else boss.x += Math.sin(Date.now() / 500) * bossSpeed;
    if (bossHP > 0) fireBossBullet();
  }

  for (let i = playerBullets.length - 1; i >= 0; i--) {
    if (boss &&
      playerBullets[i].x < boss.x + boss.width &&
      playerBullets[i].x + playerBullets[i].width > boss.x &&
      playerBullets[i].y < boss.y + boss.height &&
      playerBullets[i].y + playerBullets[i].height > boss.y
    ) {
      bossHP--;
      playerBullets.splice(i, 1);
      if (bossHP <= 0) {
        explosionSE.play();
        boss = null;
        score += 100;
      }
    }
  }

  if (player.hp <= 0) {
    alert('Game Over');
    document.location.reload();
  }

  // 「あんたが伝説！！」
  if ((oniMode && score >= 10000) || (!oniMode && score >= 3000)) {
    document.getElementById('message').innerText = 'あんたが伝説！！';
    document.getElementById('message').style.color = 'red';
    document.getElementById('topButton').style.display = 'block';
    cancelAnimationFrame(gameLoop);
    bgm.pause();
  }
}

function fireBossBullet() {
  if (!boss) return;
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

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

let assetsLoaded = 0;
const totalAssets = 11;
[playerImage, enemyImage, momoImage, shishiImage, yukiImage, zainImage, playerBulletImage, enemyBulletImage, itemImage, bossImage, backgroundImage].forEach(img => {
  img.onload = () => {
    assetsLoaded++;
    if (assetsLoaded === totalAssets) {
      // 待機中（ボタンでゲームスタート）
    }
  };
});
