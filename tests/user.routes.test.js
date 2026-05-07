const express = require('express');
const request = require('supertest');

jest.mock('../controllers/user.controller', () => ({
    getUsers: jest.fn((req, res) => res.status(200).json({ handler: 'getUsers' })),
    login: jest.fn((req, res) => res.status(200).json({ handler: 'login' })),
    getUserById: jest.fn((req, res) => res.status(200).json({ handler: 'getUserById', id: req.params.id })),
    createUser: jest.fn((req, res) => res.status(201).json({ handler: 'createUser' })),
    updateUser: jest.fn((req, res) => res.status(200).json({ handler: 'updateUser' })),
    deleteUser: jest.fn((req, res) => res.status(200).json({ handler: 'deleteUser' }))
}));

const userController = require('../controllers/user.controller');
const userRoutes = require('../routes/user.routes');

describe('user routes', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/users', userRoutes);
        jest.clearAllMocks();
    });

    test('POST /users/login routes to login controller', async () => {
        const response = await request(app)
            .post('/users/login')
            .send({ username: 'alice', password: 'secret' });

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ handler: 'login' });
        expect(userController.login).toHaveBeenCalledTimes(1);
        expect(userController.getUserById).not.toHaveBeenCalled();
    });

    test('GET /users/:id routes to getUserById controller', async () => {
        const response = await request(app).get('/users/1234567890abcdef12345678');

        expect(response.statusCode).toBe(200);
        expect(response.body.handler).toBe('getUserById');
        expect(userController.getUserById).toHaveBeenCalledTimes(1);
    });
});
