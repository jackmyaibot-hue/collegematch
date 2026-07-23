const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Player = sequelize.define('Player', {
  player_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // Account info
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  phone_number: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },

  // Personal info
  first_name: DataTypes.STRING,
  last_name: DataTypes.STRING,
  date_of_birth: DataTypes.DATEONLY,
  headshot_photo_url: DataTypes.STRING,

  // School / club info
  high_school_name: DataTypes.STRING,
  high_school_state: DataTypes.STRING,
  club_name: DataTypes.STRING,
  gpa: {
    type: DataTypes.FLOAT,
    validate: { min: 0.0, max: 4.0 }
  },
  graduation_year: DataTypes.INTEGER,

  // Athletic info
  primary_sport: DataTypes.STRING,
  position: DataTypes.STRING,
  jersey_number: DataTypes.INTEGER,

  // College preferences (from survey)
  division_level: {
    type: DataTypes.ARRAY(DataTypes.STRING), // D1, D2, D3, NAIA, Junior College
    defaultValue: []
  },
  preferred_regions: {
    type: DataTypes.ARRAY(DataTypes.STRING), // state abbreviations
    defaultValue: []
  },
  school_size: DataTypes.STRING, // under 5k, 5-10k, 10-20k, 20k+
  climate_preference: DataTypes.STRING, // cold, moderate, warm
  distance_from_home: DataTypes.STRING,
  religious_affiliation: DataTypes.STRING,
  major_interests: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  scholarship_preference: DataTypes.STRING,
  commitment_level: DataTypes.STRING,
  special_interests: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },

  // Video
  highlight_video_url: DataTypes.STRING,
  video_upload_date: DataTypes.DATE,

  // Status flags
  survey_complete: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  profile_complete: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'players',
  timestamps: true,
  underscored: true
});

module.exports = Player;
