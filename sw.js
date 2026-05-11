// Service Worker — 毎日20:30に通知を送る

let appData = { habits: [], records: {} };
let timer = null;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

// メインページからデータを受け取る
self.addEventListener('message', e => {
  if (e.data?.type === 'SYNC') {
    appData.habits  = e.data.habits;
    appData.records = e.data.records;
    scheduleFor2030();
  }
});

// 通知タップでアプリを開く
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('./'));
});

function scheduleFor2030() {
  if (timer) clearTimeout(timer);

  const now  = new Date();
  const fire = new Date();
  fire.setHours(20, 30, 0, 0);

  // すでに20:30を過ぎていたら今すぐチェック（今日まだ通知していなければ）
  if (now >= fire) {
    maybeNotify();
    fire.setDate(fire.getDate() + 1); // 次は明日の20:30
  }

  const delay = fire - now;
  timer = setTimeout(() => {
    maybeNotify();
    scheduleFor2030(); // 翌日分を再スケジュール
  }, delay);
}

function maybeNotify() {
  const today = localDateStr(new Date());

  const toRemind = appData.habits.filter(h => {
    // 今日すでに記録済みなら除外
    if (appData.records[today]?.[h.id]?.done) return false;

    // 昨日からさかのぼって連続日数を計算（今日は除く）
    let streak = 0;
    const d = new Date();
    d.setDate(d.getDate() - 1);
    for (let i = 0; i < 60; i++) {
      if (appData.records[localDateStr(d)]?.[h.id]?.done) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    // 2日以上続いているタスクだけ通知対象
    return streak >= 2;
  });

  if (toRemind.length === 0) return;

  const names = toRemind.map(h => `${h.icon} ${h.name}`).join('・');
  self.registration.showNotification('🔥 ストリークを守ろう！', {
    body: `${names}\n記録がまだです。今日も続けてみましょう💪`,
    tag: 'streak-reminder',
    renotify: true,
    icon: './icon-192.png',
    badge: './icon-192.png',
  });
}

// タイムゾーンを考慮したローカル日付文字列
function localDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
