require('dotenv').config();

const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// ルート1: "/" パスに対するGETリクエスト
router.get("/", (req, res) => {
  res.send("Express on Vercel");
});

// ルート2: "/about" パスに対するGETリクエスト
router.get("/about", (req, res) => {
  res.send("About page");
});

// ルート3: "/contact" パスに対するPOSTリクエスト
router.post("/signup", (req, res) => {
  
});

// ユーザー登録
router.post("/api/signup", async (req, res) => {
  try {
    const { firebase_uid, email, name } = req.body;
    const result = await pool.query(
      'INSERT INTO users (firebase_uid, email, name) VALUES ($1, $2, $3) RETURNING *',
      [firebase_uid, email, name]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
 
});

// グループ作成API
router.post('/api/groups', async (req, res) => {
  const { group_name } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO groups (group_name) VALUES ($1) RETURNING *',
      [group_name]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// イベント作成API
router.post('/api/events', async (req, res) => {
  const { event_name, event_date, firebase_uid, group_id } = req.body;

  try {
    const userResult = await pool.query('SELECT user_id FROM users WHERE firebase_uid = $1', [firebase_uid]);
    if (userResult.rows.length === 0) {
      return res.status(404).send('User not found');
    }

    const user_id = userResult.rows[0].user_id;

    const eventResult = await pool.query(
      'INSERT INTO events (event_name, event_date, created_by, group_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [event_name, event_date, user_id, group_id]
    );
    res.json(eventResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/join-group', async (req, res) => {
  const { group_id, firebase_uid } = req.body;

  try {
    // ユーザーの user_id を取得
    const userResult = await pool.query('SELECT user_id FROM users WHERE firebase_uid = $1', [firebase_uid]);
    if (userResult.rows.length === 0) {
      return res.status(404).send('User not found');
    }

    const user_id = userResult.rows[0].user_id;

    // ユーザーをグループに追加
    const userGroupResult = await pool.query(
      'INSERT INTO user_groups (user_id, group_id) VALUES ($1, $2) RETURNING *',
      [user_id, group_id]
    );

    res.json(userGroupResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/groups/:group_id/members', async (req, res) => {
  const { group_id } = req.params;

  try {
    const result = await pool.query(`
      SELECT u.user_id, u.name, u.email 
      FROM users u
      INNER JOIN user_groups ug ON u.user_id = ug.user_id
      WHERE ug.group_id = $1
    `, [group_id]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/invite-members', async (req, res) => {
  const { event_name, user_ids } = req.body;

  try {
    const eventResult = await pool.query('SELECT event_id FROM events WHERE event_name = $1', [event_name]);
    if (eventResult.rows.length === 0) {
      return res.status(404).send('Event not found');
    }

    const event_id = eventResult.rows[0].event_id;

    const values = user_ids.map(user_id => `(${event_id}, ${user_id}, 3)`).join(',');
    await pool.query(`
      INSERT INTO event_participants (event_id, user_id, status) VALUES ${values}
    `);

    res.send('Members invited');
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;
