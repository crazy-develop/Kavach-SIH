const crypto = require('crypto');
const secrets = require('secrets.js-grempe');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const Custodian = require('../models/Custodian');
const { encryptShareWithPassword } = require('../utils/cryptoUtils');
const { resetSessions } = require('../utils/sessionStore');

const CUSTODIANS = [
  { name: 'A Sharma', role: 'Exam Controller', email: 'a@exam.gov' },
  { name: 'B Singh', role: 'Center Head', email: 'b@exam.gov' },
  { name: 'C Kumar', role: 'Police Observer', email: 'c@exam.gov' },
  { name: 'D Rao', role: 'District Officer', email: 'd@exam.gov' },
  { name: 'E Verma', role: 'State Rep', email: 'e@exam.gov' }
];

async function seedCustodiansAndShares() {
  await Custodian.deleteMany({});
  await require('../models/LoginLog').deleteMany({});
  await require('../models/ShareSubmission').deleteMany({});
  resetSessions();

  const masterKey = crypto.randomBytes(32).toString('hex');
  const shares = secrets.share(masterKey, CUSTODIANS.length, 3);

  const result = [];

  for (let i = 0; i < CUSTODIANS.length; i++) {
    const tempPassword = crypto.randomBytes(6).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const totpSecret = speakeasy.generateSecret({ name: `ExamAuth:${CUSTODIANS[i].email}`, length: 20 });
    const encryptedShare = encryptShareWithPassword(shares[i], tempPassword);
    const qrDataUrl = await qrcode.toDataURL(totpSecret.otpauth_url);

    await Custodian.create({
      ...CUSTODIANS[i],
      passwordHash,
      totpSecret: totpSecret.base32,
      encryptedShare
    });

    result.push({
      name: CUSTODIANS[i].name,
      role: CUSTODIANS[i].role,
      email: CUSTODIANS[i].email,
      tempPassword,
      totpSecret: totpSecret.base32,
      qrDataUrl
    });
  }

  const insertedCustodians = await Custodian.find({});
  const LoginLog = require('../models/LoginLog');
  const fakeLogs = [];
  const statuses = ['success', 'success', 'success', 'fail'];
  
  for(let i=0; i<40; i++) {
    const randomCust = insertedCustodians[Math.floor(Math.random() * insertedCustodians.length)];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    const pastTime = new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000));
    
    fakeLogs.push({
      custodianId: randomCust._id,
      loginTime: pastTime,
      ipAddress: '192.168.1.' + Math.floor(Math.random() * 255),
      deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      status: randomStatus
    });
  }

  for(let i=0; i<5; i++) {
     const pastTime = new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000));
     fakeLogs.push({
       loginTime: pastTime,
       ipAddress: '10.0.0.' + Math.floor(Math.random() * 255),
       deviceInfo: 'System / Admin Panel',
       status: 'success'
     });
  }

  await LoginLog.insertMany(fakeLogs);

  return {
    totalShares: CUSTODIANS.length,
    threshold: 3,
    custodians: result
  };
}

module.exports = { seedCustodiansAndShares };
