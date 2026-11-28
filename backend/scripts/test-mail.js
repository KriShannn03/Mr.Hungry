require('dotenv').config();
const { sendMail } = require('../src/utils/mailer');

sendMail({ to: process.argv[2], subject: 'Mr. Hungry test', text: 'It works.' })
  .then(() => console.log('Sent! Check the inbox (and spam).'))
  .catch(err => console.error('Failed:', err.message));