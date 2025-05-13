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

// プレイヤー設定
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
let invincible = false;
let invincibleTimer = 0;

// イベントリスナー
document.addEventListener('keydown', (e) => keys[e.key] = true);
document.addEventListener('keyup', (e) => keys[e.key] = false);

// スタート（通常モード）
document.getElementById('startButton').addEventListener('click', () => {
  document.getElementById('startButton').style.display = 'none';
  document.getElementById('oniButton').style.display = 'none';
  document.getElementById('gameTitle').style.display = 'none';
  document.getElementById('message').innerText = '';
  player.hp = oniMode ? 2 : 3;
  bgm.loop = true;
  bgm.play();
  gameLoop();
});

// 鬼モード
document.getElementById('oniButton').addEventListener('click', () => {
  oniMode = true;
  document.getElementById('startButton').click(); // 通常スタート処理を流用
});

// TOPボタン
document.getElementById('topButton').addEventListener('click', () => {
  location.reload();
});

// 敵出現
setInterval(() => {
  const enemyTypes = ['momo', 'shishi', 'yuki', 'zain'];
  const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
  enemies.push({
    x: Math.random() * (canvas.width - 32),
    y: -32,
    width: 32,
    height: 32,
    type: type
  });
}, 1000);

// アイテム出現
setInterval(() => {
  items.push({
    x: Math.random() * (canvas.width - 32),
    y: -32,
    width: 32,
    height: 32
  });
}, 10000);

// 描画処理
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
  ctx.font = "16px sans-serif";
  ctx.fillStyle = 'white';
  ctx.fillText(`Score: ${score}`, 10, 20);
  ctx.fillText(`HP: ${player.hp}`, 10, 40);
}

// 更新処理
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

  // 弾と敵の当たり判定
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
          score += 10;
        }
        break;
      }
    }
  }

  // 敵弾とプレイヤー
  if (!invincible) {
    for (let b of enemyBullets) {
      if (collision(b, player)) {
        player.hp--;
        b.y = canvas.height + 1;
        invincible = true;
        invincibleTimer = 60;
        break;
      }
    }
  }

  // 無敵時間
  if (invincible) {
    invincibleTimer--;
    if (invincibleTimer <= 0) invincible = false;
  }

  // アイテムとプレイヤー
  for (let i = items.length - 1; i >= 0; i--) {
    if (collision(items[i], player)) {
      itemSE.currentTime = 0;
      itemSE.play();
      player.hp++;
      items.splice(i, 1);
    }
  }

  // ボス出現
  if ((oniMode ? score >= 100 * (bossCount + 1) : score >= 100 && !boss)) {
    bossSE.play();
    boss = {
      x: canvas.width / 2 - 64,
      y: -128,
      width: 128,
      height: 128
    };
    bossHP = oniMode && bossCount === 1 ? 200 : 100;
    bossPhase = 1;
    bossCount++;
  }

  // ボス移動とフェーズ
  if (boss) {
    if (boss.y < 100) boss.y += bossSpeed / 2;
    else boss.x += Math.sin(Date.now() / 500) * bossSpeed;
    if (bossHP <= 50 && bossPhase === 1) {
      bossPhase = 2;
      bossSpeed += 1;
    }
    if (bossHP > 0) fireBossBullet();
  }

  // ボスとプレイヤー弾
  for (let i = playerBullets.length - 1; i >= 0; i--) {
    if (boss && collision(playerBullets[i], boss)) {
      bossHP--;
      playerBullets.splice(i, 1);
      if (bossHP <= 0) {
        explosionSE.play();
        boss = null;
        score += 100;
      }
    }
  }

  // ゲームオーバー
  if (player.hp <= 0) {
    alert('Game Over');
    document.location.reload();
  }

  // 勝利判定
  if ((oniMode && score >= 10000) || (!oniMode && score >= 3000)) {
    document.getElementById('message').innerText = 'あんたが伝説！！';
    document.getElementById('message').style.color = 'red';
    document.getElementById('topButton').style.display = 'block';
    bgm.pause();
    return;
  }

  // 画面外削除
  playerBullets = playerBullets.filter(b => b.y + b.height > 0);
  enemyBullets = enemyBullets.filter(b => b.y < canvas.height);
  enemies = enemies.filter(e => e.y < canvas.height);
  items = items.filter(i => i.y < canvas.height);
}

// 衝突判定
function collision(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
         a.y < b.y + b.height && a.y + a.height > b.y;
}

// 弾発射関数
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

// メインループ
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// 読み込み確認
let assetsLoaded = 0;
const totalAssets = 11;
[playerImage, enemyImage, momoImage, shishiImage, yukiImage, zainImage, playerBulletImage, enemyBulletImage, itemImage, bossImage, backgroundImage].forEach(img => {
  img.onload = () => {
    assetsLoaded++;
    if (assetsLoaded === totalAssets) {
      // 全アセット読み込み済み
    }
  };
});
