const mongoose = require('mongoose');

// Mock connect
mongoose.connect = async () => {
  console.log('MOCK MongoDB connected!');
  return mongoose;
};

mongoose.disconnect = async () => {
  console.log('MOCK MongoDB disconnected!');
};

// Simple in-memory database store
const db = {
  teachers: [],
  questions: [],
  admins: []
};

// Monkey-patch Mongoose Model methods
const Model = mongoose.Model;

Model.findOne = function(query) {
  console.log(`MOCK Model.findOne on ${this.modelName} with query:`, query);
  let list = [];
  if (this.modelName === 'Teacher') list = db.teachers;
  else if (this.modelName === 'Admin') list = db.admins;
  else if (this.modelName === 'Question') list = db.questions;

  const found = list.find(item => {
    return Object.keys(query).every(key => {
      if (query[key] instanceof RegExp) {
        return query[key].test(item[key]);
      }
      return item[key] === query[key];
    });
  });

  const queryObj = {
    exec: async () => found,
    then: function(resolve, reject) {
      return Promise.resolve(found).then(resolve, reject);
    },
    sort: function() { return this; }
  };
  return queryObj;
};

Model.find = function(query) {
  console.log(`MOCK Model.find on ${this.modelName} with query:`, query);
  let list = [];
  if (this.modelName === 'Teacher') list = db.teachers;
  else if (this.modelName === 'Question') list = db.questions;

  const found = list.filter(item => {
    return Object.keys(query).every(key => {
      if (query[key] instanceof RegExp) {
        return query[key].test(item[key]);
      }
      return item[key] === query[key];
    });
  });

  const queryObj = {
    exec: async () => found,
    then: function(resolve, reject) {
      return Promise.resolve(found).then(resolve, reject);
    },
    sort: function() { return this; }
  };
  return queryObj;
};

Model.create = async function(doc) {
  console.log(`MOCK Model.create on ${this.modelName} with doc:`, doc);
  let list = [];
  if (this.modelName === 'Teacher') list = db.teachers;
  else if (this.modelName === 'Admin') list = db.admins;
  else if (this.modelName === 'Question') list = db.questions;

  const newDoc = { 
    ...doc, 
    _id: Math.random().toString(36).substring(7),
    save: async function() { return this; }
  };
  list.push(newDoc);
  return newDoc;
};

Model.countDocuments = function(query) {
  console.log(`MOCK Model.countDocuments on ${this.modelName} with query:`, query);
  let list = [];
  if (this.modelName === 'Question') list = db.questions;

  const count = list.filter(item => {
    return Object.keys(query).every(key => item[key] === query[key]);
  }).length;

  const queryObj = {
    exec: async () => count,
    then: function(resolve, reject) {
      return Promise.resolve(count).then(resolve, reject);
    }
  };
  return queryObj;
};

Model.deleteOne = function(query) {
  console.log(`MOCK Model.deleteOne on ${this.modelName} with query:`, query);
  let list = [];
  if (this.modelName === 'Question') list = db.questions;

  const index = list.findIndex(item => {
    return Object.keys(query).every(key => item[key] === query[key]);
  });

  let deletedCount = 0;
  if (index !== -1) {
    list.splice(index, 1);
    deletedCount = 1;
  }

  const queryObj = {
    exec: async () => ({ deletedCount }),
    then: function(resolve, reject) {
      return Promise.resolve({ deletedCount }).then(resolve, reject);
    }
  };
  return queryObj;
};

// Drop legacy index stub
Model.collection = {
  indexes: async () => [],
  dropIndex: async () => {}
};

console.log('Mongoose Mocking Active');
