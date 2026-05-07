const express = require('express');
const path = require('node:path');
const test = require('node:test');
const { assert, clearModules, request } = require('./test-helpers');

function installControllerStub() {
    // Replace the real controller in Node's require cache so this file tests
    // route matching only, not controller implementation details.
    const controllerPath = path.resolve(__dirname, '../controllers/user.controller.js');
    const calls = {
        getUsers: [],
        login: [],
        getUserById: [],
        createUser: [],
        updateUser: [],
        deleteUser: []
    };
    const controller = {
        getUsers: (req, res) => {
            calls.getUsers.push(req);
            res.status(200).json({ handler: 'getUsers' });
        },
        login: (req, res) => {
            calls.login.push(req);
            res.status(200).json({ handler: 'login' });
        },
        getUserById: (req, res) => {
            calls.getUserById.push(req);
            res.status(200).json({ handler: 'getUserById', id: req.params.id });
        },
        createUser: (req, res) => {
            calls.createUser.push(req);
            res.status(201).json({ handler: 'createUser' });
        },
        updateUser: (req, res) => {
            calls.updateUser.push(req);
            res.status(200).json({ handler: 'updateUser' });
        },
        deleteUser: (req, res) => {
            calls.deleteUser.push(req);
            res.status(200).json({ handler: 'deleteUser' });
        }
    };

    delete require.cache[controllerPath];
    require.cache[controllerPath] = {
        id: controllerPath,
        filename: controllerPath,
        loaded: true,
        exports: controller
    };

    return { controllerPath, calls };
}

function createApp() {
    // Build a tiny Express app with only the user routes mounted.
    process.env.JWT_SECRET = 'test-secret';
    const { controllerPath, calls } = installControllerStub();
    clearModules(['../routes/user.routes']);
    const userRoutes = require('../routes/user.routes');
    const app = express();
    app.use(express.json());
    app.use('/users', userRoutes);

    return { app, calls, controllerPath };
}

test('POST /users/login routes to login controller', async () => {
    const { app, calls, controllerPath } = createApp();

    try {
        const response = await request(app, 'POST', '/users/login', {
            body: { username: 'alice', password: 'secret' }
        });

        assert.equal(response.statusCode, 200);
        assert.deepEqual(response.body, { handler: 'login' });
        assert.equal(calls.login.length, 1);
        assert.equal(calls.getUserById.length, 0);
    } finally {
        delete require.cache[controllerPath];
    }
});

test('GET /users/:id routes to getUserById controller', async () => {
    const { app, calls, controllerPath } = createApp();

    try {
        const response = await request(app, 'GET', '/users/1234567890abcdef12345678');

        assert.equal(response.statusCode, 200);
        assert.equal(response.body.handler, 'getUserById');
        assert.equal(calls.getUserById.length, 1);
    } finally {
        delete require.cache[controllerPath];
    }
});
