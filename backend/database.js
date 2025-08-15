'use strict';

const { registerTypes } = require('pgvector/sequelize');
const db = require('./models');

// Function to set up the vector extension in the database
const setupVectorExtension = async () => {
    await db.sequelize.query('CREATE EXTENSION IF NOT EXISTS vector;');
    registerTypes(db.sequelize);
};

// We are exporting the db object from models/index.js, which contains the sequelize instance
// and all the models. We are also exporting our custom setup function.
module.exports = {
    ...db,
    setupVectorExtension
};
