jest.mock('../models/post.model', () => ({
    find: jest.fn()
}));

const Post = require('../models/post.model');
const postController = require('../controllers/post.controller');

function createRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

describe('post controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('categoryPosts queries by req.params.category', async () => {
        Post.find.mockResolvedValueOnce([{ _id: '1' }]);
        const req = { params: { category: 'abc123' } };
        const res = createRes();

        await postController.categoryPosts(req, res);

        expect(Post.find).toHaveBeenCalledWith({ category: 'abc123' });
        expect(res.json).toHaveBeenCalledWith([{ _id: '1' }]);
        expect(res.status).not.toHaveBeenCalled();
    });
});
