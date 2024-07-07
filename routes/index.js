const express = require('express');
const router = express.Router();

// ルート1: "/" パスに対するGETリクエスト
router.get("/", (req, res) => {
  res.send("Express on Vercel");
});

// ルート2: "/about" パスに対するGETリクエスト
router.get("/about", (req, res) => {
  res.send("About page");
});

// ルート3: "/contact" パスに対するPOSTリクエスト
router.post("/contact", (req, res) => {
  res.send("Contact form submitted");
});

module.exports = router;
