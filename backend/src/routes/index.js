const express = require('express');
const router = express.Router();

router.use('/tournament', require('./tournament'));
router.use('/groups', require('./groups'));
router.use('/matches', require('./matches'));
router.use('/bracket', require('./bracket'));

router.get('/health', (req, res) => res.json({ ok: true }));

module.exports = router;
