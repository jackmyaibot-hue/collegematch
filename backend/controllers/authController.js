const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendSMS } = require('../utils/twilio');
const Player = require('../models/Player');

// In-memory store for verification codes (use Redis in production)
const verificationCodes = new Map();

// Step 1: Sign up - create account and send 2FA code
exports.signup = async (req, res) => {
  try {
    const { email, phone_number, password } = req.body;

    if (!email || !phone_number || !password) {
      return res.status(400).json({ error: 'Email, phone number, and password are required' });
    }

    const existingPlayer = await Player.findOne({ where: { email } });
    if (existingPlayer) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const player = await Player.create({
      email,
      phone_number,
      password_hash,
      phone_verified: false
    });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    verificationCodes.set(player.player_id, { code, expires: Date.now() + 10 * 60 * 1000 });

    await sendSMS(phone_number, `Your verification code is: ${code}`);

    res.json({
      success: true,
      message: 'Verification code sent to phone',
      player_id: player.player_id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Step 2: Verify 2FA code
exports.verify2FA = async (req, res) => {
  try {
    const { player_id, verification_code } = req.body;

    const stored = verificationCodes.get(player_id);
    if (!stored || stored.expires < Date.now()) {
      return res.status(400).json({ error: 'Verification code expired, request a new one' });
    }
    if (stored.code !== verification_code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    const [, [player]] = await Player.update(
      { phone_verified: true },
      { where: { player_id }, returning: true }
    );

    verificationCodes.delete(player_id);

    const token = jwt.sign({ player_id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({ success: true, token, player });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const player = await Player.findOne({ where: { email } });
    if (!player) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, player.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ player_id: player.player_id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({ success: true, token, player });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
