require('dotenv').config();

const pool = require('../config/database'); // データベースの設定を読み込む

let connects = []; // 接続しているクライアントのリストを保持する配列

// データベースにメッセージを保存する関数
async function saveMessage(message) {
  const query = 'INSERT INTO messages (content) VALUES ($1)';
  await pool.query(query, [message]);
}

// 過去のメッセージを取得する関数
async function getMessages() {
  const query = 'SELECT content FROM messages ORDER BY created_at DESC LIMIT 50';
  const result = await pool.query(query);
  return result.rows.map(row => row.content);
}

module.exports = function(app) {
  app.ws('/ws', async (ws, req) => {
    connects.push(ws); // 新しいクライアントを接続リストに追加

    const messages = await getMessages(); // 過去のメッセージを取得
    messages.forEach(message => {
      ws.send(message); // 過去のメッセージをクライアントに送信
    });

    ws.on('message', async (message) => {
      console.log('Received:', message); // 受信したメッセージをログに出力

      await saveMessage(message); // メッセージをデータベースに保存

      connects.forEach((socket) => {
        if (socket.readyState === 1) { // 接続が開いている場合
          socket.send(message); // メッセージを全てのクライアントに送信
        }
      });
    });

    ws.on('close', () => {
      connects = connects.filter((conn) => conn !== ws); // クローズしたクライアントを接続リストから削除
    });
  });
};
