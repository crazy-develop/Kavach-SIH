require('dotenv').config();
require('../utils/dns').ensureDns();
const mongoose = require('mongoose');
const LoginLog = require('../models/LoginLog');
const Custodian = require('../models/Custodian');
const { seedCustodiansAndShares } = require('../services/seedService');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME });
  
  console.log('Seeding custodians in correct DB...');
  await seedCustodiansAndShares();

  const custodians = await Custodian.find();
  const fakeLogs = [];
  const statuses = ['success', 'success', 'success', 'fail'];
  
  for(let i=0; i<35; i++) {
    const randomCust = custodians[Math.floor(Math.random() * custodians.length)];
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
  console.log('Restored custodians and 40 historical logs successfully in DB: ' + process.env.DB_NAME);
  process.exit(0);
}

run();
