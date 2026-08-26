const crypto = require('crypto');
const Document = require('../models/Document');
const { encryptAesGcm, decryptAesGcm } = require('../utils/cryptoUtils');
const { getActiveSession } = require('../utils/sessionStore');

// Deterministic master key for admin uploads when vault is locked
const ADMIN_FALLBACK_KEY = crypto.createHash('sha256').update('kavach-admin-fallback-key-2026').digest();

function masterKeyBuffer() {
  const session = getActiveSession();
  if (session && session.masterKeyReconstructed) {
    return Buffer.from(session.masterKeyReconstructed, 'hex');
  }
  return ADMIN_FALLBACK_KEY;
}

async function upload(req, res) {
  const { name, mimeType, data } = req.body;
  if (!name || !data) {
    return res.status(400).json({ error: 'name and base64 data required' });
  }

  const masterKey = masterKeyBuffer();

  const fileKey = crypto.randomBytes(32);
  const buffer = Buffer.from(data, 'base64');

  const fileEnc = encryptAesGcm(buffer, fileKey);
  const keyEnc = encryptAesGcm(fileKey, masterKey);

  const doc = await Document.create({
    name,
    mimeType: mimeType || 'application/octet-stream',
    size: buffer.length,
    encryptedData: fileEnc.data,
    iv: fileEnc.iv,
    tag: fileEnc.tag,
    encryptedFileKey: keyEnc.data,
    fileKeyIv: keyEnc.iv,
    fileKeyTag: keyEnc.tag,
    uploadedBy: req.admin ? req.admin.email : 'system'
  });

  return res.json({
    message: 'Document uploaded and encrypted (AES-256-GCM)',
    id: doc._id,
    name: doc.name,
    size: doc.size,
    uploadedAt: doc.uploadedAt
  });
}

async function list(req, res) {
  const session = getActiveSession();
  const docs = await Document.find()
    .sort({ uploadedAt: -1 })
    .select('name mimeType size uploadedAt uploadedBy');
  return res.json({ documents: docs, locked: !(session && session.masterKeyReconstructed) });
}

async function decrypt(req, res) {
  const doc = await Document.findById(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const masterKey = masterKeyBuffer();

  const fileKey = decryptAesGcm(doc.encryptedFileKey, doc.fileKeyIv, doc.fileKeyTag, masterKey);
  const plaintext = decryptAesGcm(doc.encryptedData, doc.iv, doc.tag, fileKey);

  return res.json({
    id: doc._id,
    name: doc.name,
    mimeType: doc.mimeType,
    size: doc.size,
    data: plaintext.toString('base64')
  });
}

async function remove(req, res) {
  const doc = await Document.findById(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }
  await Document.deleteOne({ _id: req.params.id });
  return res.json({ success: true, message: 'Document deleted' });
}

module.exports = { upload, list, decrypt, remove };
