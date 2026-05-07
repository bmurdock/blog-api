jest.mock('../models/post.model', () => ({
    find: jest.fn(),
    findByIdAndDelete: jest.fn()
}));

const Post = require('../models/post.model');
const postController = require('../controllers/post.controller');

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

describe('post controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('getPosts applies bounded pagination and lean reads', async () => {
        const query = createQuery([{ _id: '1' }]);
        Post.find.mockReturnValueOnce(query);
        const req = { query: { limit: '500', page: '2' } };
        const res = createRes();

        await postController.getPosts(req, res);

        expect(Post.find).toHaveBeenCalledWith({});
        expect(query.sort).toHaveBeenCalledWith({ _id: -1 });
        expect(query.skip).toHaveBeenCalledWith(100);
        expect(query.limit).toHaveBeenCalledWith(100);
        expect(query.lean).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith([{ _id: '1' }]);
    });

    test('categoryPosts queries by req.params.category with default pagination', async () => {
        const query = createQuery([{ _id: '1' }]);
        Post.find.mockReturnValueOnce(query);
        const req = { params: { category: 'abc123' }, query: {} };
        const res = createRes();

        await postController.categoryPosts(req, res);

        expect(Post.find).toHaveBeenCalledWith({ category: 'abc123' });
        expect(query.skip).toHaveBeenCalledWith(0);
        expect(query.limit).toHaveBeenCalledWith(20);
        expect(query.lean).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith([{ _id: '1' }]);
        expect(res.status).not.toHaveBeenCalled();
    });
});
