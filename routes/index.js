require('dotenv').config();

const express = require('express');
const router = express.Router();
const pool = require('../config/database');

router.get("/", (req, res) => {
  res.send("Express on Vercel");
});

// ユーザー登録 〇
router.post("/api/registry", async (req, res) => {
  try {
    const { firebase_uid, name, email } = req.body;
    const result = await pool.query(
      'INSERT INTO usersA (firebase_uid, user_name, user_email) VALUES ($1, $2, $3) RETURNING *',
      [firebase_uid, name, email]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// グループ作成 〇
router.post('/api/groups', async (req, res) => {
  const { group_name, firebase_uid } = req.body;
  try {
    // グループを作成
    const result1 = await pool.query(
      'INSERT INTO groupsA (group_name) VALUES ($1) RETURNING *',
      [group_name]
    );

    // group_id を取得
    const group_id = result1.rows[0].group_id;

    // ユーザーの user_id を取得
    const userResult = await pool.query('SELECT user_id FROM usersA WHERE firebase_uid = $1', [firebase_uid]);
    if (userResult.rows.length === 0) {
      return res.status(404).send('User not found');
    }

    const user_id = userResult.rows[0].user_id;

    // user_groupsA テーブルにデータを挿入
    const result2 = await pool.query(
      'INSERT INTO user_groupsB (group_id, user_id) VALUES ($1, $2) RETURNING *',
      [group_id, user_id]
    );
    res.json(result2.rows[0]);
  } catch (err) {
    console.error(err); // エラーログを出力
    res.status(500).json({ error: err.message });
  }
});

// 既存のグループに参加 〇
router.post('/api/join-group', async (req, res) => {
  const { group_id, firebase_uid } = req.body;

  try {
    // ユーザーの user_id を取得
    const userResult = await pool.query('SELECT user_id FROM usersA WHERE firebase_uid = $1', [firebase_uid]);
    if (userResult.rows.length === 0) {
      return res.status(404).send('User not found');
    }

    const user_id = userResult.rows[0].user_id;

    // ユーザーをグループに追加
    const userGroupResult = await pool.query(
      'INSERT INTO user_groupsB (group_id, user_id) VALUES ($1, $2) RETURNING *',
      [group_id, user_id]
    );
    res.json(userGroupResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ユーザーのグループID、グループ名を取得 〇
router.post('/api/users/group', async (req, res) => {
  const { firebase_uid } = req.body;

  try {
  // ユーザーの user_id を取得
  const userResult = await pool.query('SELECT user_id FROM usersA WHERE firebase_uid = $1', [firebase_uid]);
  if (userResult.rows.length === 0) {
    return res.status(404).send('User not found');
  }

  const user_id = userResult.rows[0].user_id;

    // ユーザーが所属するグループIDを取得
    const groupResult = await pool.query('SELECT group_id FROM user_groupsB WHERE user_id = $1', [user_id]);
    
    if (groupResult.rows.length === 0) {
      return res.status(404).send('No groups found for this user');
    }

    // グループIDを元にグループ名を取得
    const groupIds = groupResult.rows.map(row => row.group_id);
    const groupDetails = [];
    
    for (let groupId of groupIds) {
      const nameResult = await pool.query('SELECT group_id, group_name FROM groupsA WHERE group_id = $1', [groupId]);
      if (nameResult.rows.length > 0) {
        groupDetails.push({
          group_id: nameResult.rows[0].group_id,
          group_name: nameResult.rows[0].group_name
        });
      }
    }
    res.json(groupDetails);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/groups/calendar', async (req, res) => {
  const { group_id } = req.body;
  
  try {
    // グループに参加しているユーザーの名前一覧を取得
    const usersResult = await pool.query(
      'SELECT u.user_id, u.user_name FROM usersA u JOIN user_groupsB ug ON u.user_id = ug.user_id WHERE ug.group_id = $1',
      [group_id]
    );

    if (usersResult.rows.length === 0) {
      return res.status(404).json({ error: 'No users found for this group' });
    }

    const users = usersResult.rows;

    // 今日から一週間のステータスを取得
    const today = new Date();
    const dates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      return date.toISOString().split('T')[0]; // 'YYYY-MM-DD'形式
    });

    const statusPromises = users.map(user => {
      return pool.query(
        'SELECT date, status FROM schedulesA WHERE user_id = $1 AND date = ANY($2::date[])',
        [user.user_id, dates]
      );
    });

    const statusResults = await Promise.all(statusPromises);

    // 各ユーザーのステータスをマッピング
    const userStatuses = users.map((user, index) => {
      return {
        user_id: user.user_id,
        user_name: user.user_name,
        status: statusResults[index].rows.reduce((acc, row) => {
          acc[row.date] = row.status;
          return acc;
        }, {})
      };
    });

    res.json(userStatuses);
  } catch (err) {
    console.error(err);
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
