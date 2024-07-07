require('dotenv').config(); // 環境変数の管理
const express = require('express'); // express
const expressWs = require('express-ws'); // WebSocket通信
const cors = require('cors'); // アクセス制限解除
const { Pool } = require('pg');


const app = express(); // express
expressWs(app); // WebSocketに対応

let connects = []; // 接続しているクライアント一覧

console.log(process.env.POSTGRES_URL);

const pool = new Pool({ // データベースの設定
    connectionString: process.env.POSTGRES_URL,
  });

app.use(cors()); // アクセス制限解除

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


app.ws('/ws', async (ws, req) => { // 新しいクライアントが接続した時
  connects.push(ws); // 配列に代入
  const messages = await getMessages(); // データベースから情報を取り出す
  messages.forEach(message => { // 繰り返し
    ws.send(message); // 過去のメッセージを全て送信
  });

  ws.on('message', async (message) => { // メッセージを受け取った時
    console.log('Received:', message);

    await saveMessage(message); // メッセージをデータベースに保存

    connects.forEach((socket) => { // クライアント一つ一つに対して
      if (socket.readyState === 1) { // 1:OPEN 接続の現在の状態を示す
        socket.send(message); // メッセージを送る
        }
    });
    });

  ws.on('close', () => { // 接続が解除されたら
    connects = connects.filter((conn) => conn !== ws); // そいつだけ排除する
    });
});

