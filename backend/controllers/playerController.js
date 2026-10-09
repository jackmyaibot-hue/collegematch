const Player = require('../models/Player');

// Get player profile
exports.getProfile = async (req, res) => {
  try {
    const { playerId } = req.params;
    const player = await Player.findByPk(playerId, {
      attributes: { exclude: ['password_hash'] }
    });

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json(player);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update player profile / survey fields
exports.updateProfile = async (req, res) => {
  try {
    const { playerId } = req.params;
    const updates = { ...req.body };
    delete updates.password_hash;
    delete updates.email;
    delete updates.phone_number;

    const [, [player]] = await Player.update(updates, {
      where: { player_id: playerId },
      returning: true
    });

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json({ success: true, player });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Upload headshot photo (expects multer middleware to populate req.file)
exports.uploadPhoto = async (req, res) => {
  try {
    const { playerId } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const [, [player]] = await Player.update(
      { headshot_photo_url: req.file.path },
      { where: { player_id: playerId }, returning: true }
    );

    res.json({ success: true, player });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Upload highlight video
exports.uploadVideo = async (req, res) => {
  try {
    const { playerId } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const [, [player]] = await Player.update(
      { highlight_video_url: req.file.path, video_upload_date: new Date() },
      { where: { player_id: playerId }, returning: true }
    );

    res.json({ success: true, player });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
