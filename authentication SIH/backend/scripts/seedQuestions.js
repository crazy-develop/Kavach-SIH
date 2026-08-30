const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const Question = require('../models/Question');
const { ensureDns } = require('../utils/dns');

async function seed() {
  try {
    ensureDns();
  } catch (err) {
    console.warn('DNS helper warning:', err.message);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI missing in backend/.env');
    process.exit(1);
  }

  console.log(`Connecting to MongoDB...`);
  await mongoose.connect(uri, { dbName: process.env.DB_NAME || 'exam_auth' });
  console.log('Connected to MongoDB successfully.');

  try {
    const filePath = path.join(__dirname, '../ZEEA_NEET_Question_Bank_2000_Template.xlsx');
    console.log(`Reading Excel file from ${filePath}...`);
    const workbook = xlsx.readFile(filePath);
    
    const sheetName = 'Question Bank';
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found in Excel file.`);
    }

    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    console.log(`Found ${rows.length} rows in "${sheetName}" sheet.`);

    // 1. Bulk check for existing items (Deduplication fingerprint Set)
    const existing = await Question.find({}, { sourceId: 1, status: 1 });
    const existingSourceIds = new Set();
    
    const statusCounts = {
      DRAFT: 0,
      UNDER_REVIEW: 0,
      APPROVED: 0,
      ACTIVE: 0,
      RETIRED: 0
    };

    for (const q of existing) {
      if (q.sourceId) {
        existingSourceIds.add(q.sourceId);
        statusCounts[q.status] = (statusCounts[q.status] || 0) + 1;
      }
    }

    let skippedCount = 0;
    let duplicatePrevented = 0;
    const questionsToInsert = [];

    const answerIndexMap = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };

    for (const row of rows) {
      const sourceId = String(row['ID'] || '').trim();
      if (!sourceId) {
        skippedCount++;
        continue;
      }

      if (existingSourceIds.has(sourceId)) {
        duplicatePrevented++;
        continue;
      }

      const questionText = String(row['Question'] || '').trim();
      const subject = String(row['Subject'] || '').trim();
      const chapter = String(row['Chapter'] || '').trim();
      const topic = String(row['Topic'] || '').trim();
      const difficulty = String(row['Difficulty'] || 'Medium').trim();
      const marks = Number(row['Marks']) || 4;
      const explanation = String(row['Explanation'] || '').trim();
      const source = String(row['Source'] || 'Original - prototype').trim();
      
      const optionA = String(row['Option A'] || '').trim();
      const optionB = String(row['Option B'] || '').trim();
      const optionC = String(row['Option C'] || '').trim();
      const optionD = String(row['Option D'] || '').trim();
      const options = [optionA, optionB, optionC, optionD];

      const correctAnswer = String(row['Correct Answer'] || '').trim().toUpperCase();
      const correctOptionIndex = answerIndexMap[correctAnswer];

      if (correctOptionIndex === undefined || !questionText || !subject || !chapter) {
        skippedCount++;
        continue;
      }

      const status = 'DRAFT';
      
      questionsToInsert.push({
        questionText,
        options,
        correctOptionIndex,
        correctAnswer,
        subject,
        chapter,
        topic,
        difficulty,
        status,
        marks,
        source,
        sourceId
      });

      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }

    if (questionsToInsert.length > 0) {
      console.log(`Inserting ${questionsToInsert.length} new questions...`);
      await Question.insertMany(questionsToInsert);
    }

    console.log('\n--- Seeding Process Completed ---');
    console.log(`Total rows processed:         ${rows.length}`);
    console.log(`Successfully imported:        ${questionsToInsert.length}`);
    console.log(`Already existing / skipped:   ${duplicatePrevented}`);
    console.log(`Invalid / empty rows skipped: ${skippedCount}`);
    console.log('Status distribution of questions currently in database:');
    for (const [status, count] of Object.entries(statusCounts)) {
      console.log(` - ${status}: ${count}`);
    }

  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

seed();
