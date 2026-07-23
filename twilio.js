const twilio = require('twilio');
require('dotenv').config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function sendSMS(toPhoneNumber, message) {
  return client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: toPhoneNumber
  });
}

module.exports = { sendSMS };
