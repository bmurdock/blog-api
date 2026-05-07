const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const categories = require('./routes/category.routes');
const users = require('./routes/user.routes');
const posts = require('./routes/post.routes');
const dbUrl = process.env.blogDB || 'mongodb://lvh.me:27017/blog';
const apiPort = parseInt(process.env.PORT || '3131', 10);

const api = express();

// Middleware runs before route handlers. These two lines let the API read JSON
// request bodies and accept requests from browser apps served from other origins.
api.use(express.json());
api.use(cors());

// Mount each resource router under the URL path for that resource.
api.use('/categories', categories);
api.use('/users', users);
api.use('/posts', posts);

// A lightweight endpoint for checking whether the Express app is responding.
api.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

async function connectDb() {
    // Tests can skip the real database connection so they stay fast and isolated.
    if (process.env.SKIP_DB_CONNECT === 'true') {
        return;
    }

    mongoose.connection.on('error', console.error.bind(console, 'Mongo Error: '));
    await mongoose.connect(dbUrl);
}

async function start() {
    // Waiting for MongoDB before listening prevents the API from accepting
    // requests that it cannot complete yet.
    await connectDb();
    return api.listen(apiPort, () => {
        console.log(`Blog API listening on port ${apiPort}`);
    });
}

// Only start the web server when this file is run directly with `node api.js`.
// Tests can require the app without opening a network port.
if (require.main === module) {
    start().catch((err) => {
        console.error('Failed to start Blog API:', err);
        process.exit(1);
    });
}

// Expose these helpers for tests and for small teaching examples.
api.connectDb = connectDb;
api.start = start;

module.exports = api;
