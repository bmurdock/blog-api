jest.mock('../models/category.model', () => ({
    find: jest.fn(),
    findByIdAndDelete: jest.fn()
}));

jest.mock('../models/post.model', () => ({
    exists: jest.fn()
}));

const Category = require('../models/category.model');
const Post = require('../models/post.model');
const categoryController = require('../controllers/category.controller');

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

describe('category controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('getCategories applies bounded pagination and lean reads', async () => {
        const query = createQuery([{ name: 'tech' }]);
        Category.find.mockReturnValueOnce(query);
        const req = { query: {} };
        const res = createRes();

        await categoryController.getCategories(req, res);

        expect(Category.find).toHaveBeenCalledWith({});
        expect(query.sort).toHaveBeenCalledWith({ _id: -1 });
        expect(query.skip).toHaveBeenCalledWith(0);
        expect(query.limit).toHaveBeenCalledWith(20);
        expect(query.lean).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith([{ name: 'tech' }]);
    });

    test('deleteCategory rejects deletes while posts reference the category', async () => {
        Post.exists.mockResolvedValueOnce({ _id: 'post1' });
        const req = { params: { id: '507f1f77bcf86cd799439011' } };
        const res = createRes();

        await categoryController.deleteCategory(req, res);

        expect(Post.exists).toHaveBeenCalledWith({ category: '507f1f77bcf86cd799439011' });
        expect(Category.findByIdAndDelete).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({ error: 'Category has posts' });
    });
});
