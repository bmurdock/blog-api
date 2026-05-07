describe('user model', () => {
    let User;

    beforeEach(() => {
        jest.resetModules();
        process.env.JWT_SECRET = 'test-secret';
        User = require('../models/user.model');
    });

    test('toJSON omits password hash and salt', async () => {
        const user = new User({ username: 'alice', email: 'alice@example.com' });

        await user.setPassword('secret');
        const json = user.toJSON();

        expect(user.hash).toBeDefined();
        expect(user.salt).toBeDefined();
        expect(json.hash).toBeUndefined();
        expect(json.salt).toBeUndefined();
    });

    test('password verification is asynchronous', async () => {
        const user = new User({ username: 'alice', email: 'alice@example.com' });

        await user.setPassword('secret');

        await expect(user.validPassword('secret')).resolves.toBe(true);
        await expect(user.validPassword('wrong')).resolves.toBe(false);
    });
});
