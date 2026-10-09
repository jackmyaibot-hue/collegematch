const express = require('express');
const router = express.Router();
const playerController = require('../controllers/playerController');
const requireAuth = require('../middleware/auth');
const { photoUpload, videoUpload } = require('../utils/fileUpload');

router.get('/:playerId', requireAuth, playerController.getProfile);
router.put('/:playerId', requireAuth, playerController.updateProfile);
router.post('/:playerId/photo', requireAuth, photoUpload.single('photo'), playerController.uploadPhoto);
router.post('/:playerId/video', requireAuth, videoUpload.single('video'), playerController.uploadVideo);

module.exports = router;
