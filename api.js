const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const categories = require('./routes/category.routes');
const users = require('./routes/user.routes');
const posts = require('./routes/post.routes');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const privateKey = fs.readFileSync('./key.pem', 'utf8');


const dbUrl = process.env.blogDB || "mongodb://lvh.me:27017/blog";
mongoose.set('useFindAndModify', false);

mongoose.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, });
mongoose.Promise = global.Promise;

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Mongo Error: '));


const apiPort = 3131;

const api = express();

api.use(express.json());
api.use(cors());

// routes
api.use('/categories', categories);
api.use('/users', users);
api.use('/posts', posts);



api.listen(apiPort, () => {
    console.log(`Blog API listening on port ${apiPort}`);
});
