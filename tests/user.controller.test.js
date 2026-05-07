jest.mock('../models/user.model', () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    findByIdAndDelete: jest.fn()
}));

jest.mock('../models/post.model', () => ({
    exists: jest.fn()
}));

const User = require('../models/user.model');
const Post = require('../models/post.model');
const userController = require('../controllers/user.controller');

function createRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

function createQuery(result) {
    return {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(result)
    };
}

describe('user controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('getUsers applies bounded pagination and lean reads', async () => {
        const query = createQuery([{ username: 'alice' }]);
        User.find.mockReturnValueOnce(query);
        const req = { query: {} };
        const res = createRes();

        await userController.getUsers(req, res);

        expect(User.find).toHaveBeenCalledWith({});
        expect(query.sort).toHaveBeenCalledWith({ _id: -1 });
        expect(query.skip).toHaveBeenCalledWith(0);
        expect(query.limit).toHaveBeenCalledWith(20);
        expect(query.lean).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith([{ username: 'alice' }]);
    });

    test('login explicitly selects password fields and awaits async password verification', async () => {
        const user = {
            validPassword: jest.fn().mockResolvedValue(true),
            toAuthJSON: jest.fn().mockReturnValue({ token: 'jwt' })
        };
        const query = { select: jest.fn().mockResolvedValue(user) };
        User.findOne.mockReturnValueOnce(query);
        const req = { body: { username: 'alice', password: 'secret' } };
        const res = createRes();

        await userController.login(req, res);

        expect(User.findOne).toHaveBeenCalledWith({ username: 'alice' });
        expect(query.select).toHaveBeenCalledWith('+hash +salt');
        expect(user.validPassword).toHaveBeenCalledWith('secret');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ token: 'jwt' });
    });

    test('deleteUser rejects deletes while posts reference the user', async () => {
        Post.exists.mockResolvedValueOnce({ _id: 'post1' });
        const req = { params: { id: '507f1f77bcf86cd799439011' } };
        const res = createRes();

        await userController.deleteUser(req, res);

        expect(Post.exists).toHaveBeenCalledWith({ author: '507f1f77bcf86cd799439011' });
        expect(User.findByIdAndDelete).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({ error: 'User has posts' });
    });
});
