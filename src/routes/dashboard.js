const express = require('express');
const router = express.Router();
const { getDashboardStats, getAllThreats } = require('../database/db');

router.get('/stats', async (req, res) => {
  try {
    const stats = await getDashboardStats();
    const recentThreats = await getAllThreats(10);
    
    res.json({
      ...stats,
      recent_threats: recentThreats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
