const createError = require('http-errors'); // HTTPエラー
const express = require('express'); // express
const path = require('path'); // ファイルパスの操作
const cookieParser = require('cookie-parser'); // クッキー追跡
const logger = require('morgan'); // ミドルウェア
const expressWs = require('express-ws'); // websocket
const cors = require('cors'); // cor

const app = express(); // express
expressWs(app);  // websocket

// ミドルウェア設定
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

// ルーティングの設定
app.use('/', require('./routes/index')); // 通常のHTTPリクエスト用のルーティング
require('./routes/websocket')(app); // WebSocketのルーティング

// 404ハンドラー
app.use(function(req, res, next) {
  next(createError(404));
});

// エラーハンドラー
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.send('error');
});

module.exports = app;
