const nodemailer = require('nodemailer');
const cfg = require('../config');

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: cfg.mail.host,
      port: cfg.mail.port,
      secure: cfg.mail.port === 465,
      auth: { user: cfg.mail.user, pass: cfg.mail.pass },
    });
  }
  return transporter;
}

exports.sendMail = ({ to, subject, text, html }) =>
  getTransporter().sendMail({ from: cfg.mail.from, to, subject, text, html });