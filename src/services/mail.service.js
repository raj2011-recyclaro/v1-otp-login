const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter;

const isMailConfigured = () =>
  Boolean(env.smtpHost && env.smtpPort && env.smtpUser && env.smtpPass && env.smtpFromEmail);

const getTransporter = () => {
  if (!isMailConfigured()) {
    throw new Error('SMTP is not fully configured');
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass
      }
    });
  }

  return transporter;
};

const toDisplayValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }

  return String(value);
};

const formatAddress = (addressSnapshot = {}) =>
  [
    addressSnapshot.label,
    addressSnapshot.line1,
    addressSnapshot.line2,
    addressSnapshot.city,
    addressSnapshot.state,
    addressSnapshot.pincode,
    addressSnapshot.country
  ]
    .filter(Boolean)
    .join(', ');

const buildPickupAcknowledgement = ({ pickup, user }) => {
  const fullAddress = formatAddress(pickup.addressSnapshot);

  const text = [
    'A new sellyourscrap pickup has been booked successfully.',
    '',
    'User Details',
    `User ID: ${toDisplayValue(user.id)}`,
    `Full Name: ${toDisplayValue(user.fullName)}`,
    `Phone: ${toDisplayValue(user.phone)}`,
    `Country: ${toDisplayValue(user.country)}`,
    `User Type: ${toDisplayValue(user.userType)}`,
    '',
    'Pickup Details',
    `Pickup ID: ${toDisplayValue(pickup.id)}`,
    `Status: ${toDisplayValue(pickup.status)}`,
    `Category: ${toDisplayValue(pickup.category)}`,
    `Weight (kg): ${toDisplayValue(pickup.weight)}`,
    `Transport Mode: ${toDisplayValue(pickup.transportMode)}`,
    `Pickup Date: ${toDisplayValue(pickup.pickupDate)}`,
    `Pickup Time: ${toDisplayValue(pickup.pickupTime)}`,
    `Scheduled At: ${toDisplayValue(pickup.scheduledAt)}`,
    `Notes: ${toDisplayValue(pickup.notes)}`,
    `Rebooked From Pickup ID: ${toDisplayValue(pickup.rebookedFromPickupId)}`,
    `Created At: ${toDisplayValue(pickup.createdAt)}`,
    `Updated At: ${toDisplayValue(pickup.updatedAt)}`,
    '',
    'Pickup Address',
    `Full Address: ${toDisplayValue(fullAddress)}`,
    `Address Label: ${toDisplayValue(pickup.addressSnapshot?.label)}`,
    `Line 1: ${toDisplayValue(pickup.addressSnapshot?.line1)}`,
    `Line 2: ${toDisplayValue(pickup.addressSnapshot?.line2)}`,
    `City: ${toDisplayValue(pickup.addressSnapshot?.city)}`,
    `State: ${toDisplayValue(pickup.addressSnapshot?.state)}`,
    `Pincode: ${toDisplayValue(pickup.addressSnapshot?.pincode)}`,
    `Country: ${toDisplayValue(pickup.addressSnapshot?.country)}`
  ].join('\n');

  const html = `
    <h2>New sellyourscrap pickup booked successfully</h2>
    <p><strong>Pickup ID:</strong> ${toDisplayValue(pickup.id)}</p>
    <h3>User Details</h3>
    <ul>
      <li><strong>User ID:</strong> ${toDisplayValue(user.id)}</li>
      <li><strong>Full Name:</strong> ${toDisplayValue(user.fullName)}</li>
      <li><strong>Phone:</strong> ${toDisplayValue(user.phone)}</li>
      <li><strong>Country:</strong> ${toDisplayValue(user.country)}</li>
      <li><strong>User Type:</strong> ${toDisplayValue(user.userType)}</li>
    </ul>
    <h3>Pickup Details</h3>
    <ul>
      <li><strong>Status:</strong> ${toDisplayValue(pickup.status)}</li>
      <li><strong>Category:</strong> ${toDisplayValue(pickup.category)}</li>
      <li><strong>Weight (kg):</strong> ${toDisplayValue(pickup.weight)}</li>
      <li><strong>Transport Mode:</strong> ${toDisplayValue(pickup.transportMode)}</li>
      <li><strong>Pickup Date:</strong> ${toDisplayValue(pickup.pickupDate)}</li>
      <li><strong>Pickup Time:</strong> ${toDisplayValue(pickup.pickupTime)}</li>
      <li><strong>Scheduled At:</strong> ${toDisplayValue(pickup.scheduledAt)}</li>
      <li><strong>Notes:</strong> ${toDisplayValue(pickup.notes)}</li>
      <li><strong>Rebooked From Pickup ID:</strong> ${toDisplayValue(pickup.rebookedFromPickupId)}</li>
      <li><strong>Created At:</strong> ${toDisplayValue(pickup.createdAt)}</li>
      <li><strong>Updated At:</strong> ${toDisplayValue(pickup.updatedAt)}</li>
    </ul>
    <h3>Pickup Address</h3>
    <ul>
      <li><strong>Full Address:</strong> ${toDisplayValue(fullAddress)}</li>
      <li><strong>Address Label:</strong> ${toDisplayValue(pickup.addressSnapshot?.label)}</li>
      <li><strong>Line 1:</strong> ${toDisplayValue(pickup.addressSnapshot?.line1)}</li>
      <li><strong>Line 2:</strong> ${toDisplayValue(pickup.addressSnapshot?.line2)}</li>
      <li><strong>City:</strong> ${toDisplayValue(pickup.addressSnapshot?.city)}</li>
      <li><strong>State:</strong> ${toDisplayValue(pickup.addressSnapshot?.state)}</li>
      <li><strong>Pincode:</strong> ${toDisplayValue(pickup.addressSnapshot?.pincode)}</li>
      <li><strong>Country:</strong> ${toDisplayValue(pickup.addressSnapshot?.country)}</li>
    </ul>
  `;

  return {
    subject: `sellyourscrap pickup acknowledgement: ${pickup.id}`,
    text,
    html
  };
};

const sendPickupAcknowledgement = async ({ pickup, user }) => {
  if (!isMailConfigured()) {
    console.warn('Pickup acknowledgement email skipped because SMTP is not configured.');
    return { skipped: true };
  }

  const content = buildPickupAcknowledgement({ pickup, user });

  return getTransporter().sendMail({
    from: env.smtpFromEmail,
    to: env.pickupAckEmail,
    cc: env.pickupAckCcEmails.length ? env.pickupAckCcEmails : undefined,
    subject: content.subject,
    text: content.text,
    html: content.html
  });
};

module.exports = {
  sendPickupAcknowledgement,
  isMailConfigured
};
