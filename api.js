const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const categories = require('./routes/category.routes');
const users = require('./routes/user.routes');
const posts = require('./routes/post.routes');
const dbUrl = process.env.blogDB || 'mongodb://lvh.me:27017/blog';
const apiPort = parseInt(process.env.PORT || '3131', 10);

const api = express();

api.use(express.json());
api.use(cors());

// routes
api.use('/categories', categories);
api.use('/users', users);
api.use('/posts', posts);

api.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

async function connectDb() {
    if (process.env.SKIP_DB_CONNECT === 'true') {
        return;
    }

    mongoose.connection.on('error', console.error.bind(console, 'Mongo Error: '));
    await mongoose.connect(dbUrl);
}

async function start() {
    await connectDb();
    return api.listen(apiPort, () => {
        console.log(`Blog API listening on port ${apiPort}`);
    });
}

if (require.main === module) {
    start().catch((err) => {
        console.error('Failed to start Blog API:', err);
        process.exit(1);
    });
}

api.connectDb = connectDb;
api.start = start;

module.exports = api;
