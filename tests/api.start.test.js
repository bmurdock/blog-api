describe('api startup', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    test('start waits for MongoDB before listening', async () => {
        process.env.SKIP_DB_CONNECT = 'true';
        const mongoose = require('mongoose');
        const connect = jest.spyOn(mongoose, 'connect').mockImplementation(async () => {
            await Promise.resolve();
        });
        jest.spyOn(mongoose.connection, 'on').mockImplementation(() => mongoose.connection);
        const api = require('../api');
        delete process.env.SKIP_DB_CONNECT;
        const server = { close: jest.fn() };
        const listen = jest.spyOn(api, 'listen').mockImplementation((port, callback) => {
            callback();
            return server;
        });

        await api.start();

        expect(connect).toHaveBeenCalledTimes(1);
        expect(listen).toHaveBeenCalledWith(3131, expect.any(Function));
    });
});
