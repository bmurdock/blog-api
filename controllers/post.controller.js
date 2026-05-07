const Category = require('../models/category.model');
const Post = require('../models/post.model');
const User = require('../models/user.model');
const { findPage } = require('./pagination');
const {
    isValidObjectId,
    pickFields,
    sameObjectId,
    sendControllerError,
    validateRequired
} = require('./request-helpers');

exports.createPost = async (req, res) => {
    if (typeof req.body === 'undefined') {
        res.status(400).json({ error: 'Request not valid' });
        return;
    }

    // A post needs text plus a category. The author comes from the JWT, not
    // from the request body, so clients cannot write posts as someone else.
    const fields = validateRequired(['title', 'body', 'category'], req.body);
    if (fields.length) {
        res.status(400).json({ error: 'Missing fields', fields });
        return;
    }
    if (!req.user || !isValidObjectId(req.user.id)) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    if (!isValidObjectId(req.body.category)) {
        res.status(400).json({ error: 'Invalid category id' });
        return;
    }

    try {
        const authorExists = await User.exists({ _id: req.user.id });
        if (!authorExists) {
            res.status(400).json({ error: 'Author not found' });
            return;
        }
        const categoryExists = await Category.exists({ _id: req.body.category });
        if (!categoryExists) {
            res.status(400).json({ error: 'Category not found' });
            return;
        }

        const payload = pickFields(req.body, ['title', 'body', 'category']);
        payload.author = req.user.id;
        const post = new Post(payload);
        const result = await post.save();
        res.json(result);
    } catch (err) {
        sendControllerError(res, err);
    }
};

exports.updatePost = async (req, res) => {
    if (typeof req.body === 'undefined') {
        res.status(400).json({ error: 'Request not valid' });
        return;
    }
    // Validate IDs at the edge of the app before passing them to Mongoose.
    if (!isValidObjectId(req.params.id)) {
        res.status(400).json({ error: 'Invalid post id' });
        return;
    }
    if (!req.user || !isValidObjectId(req.user.id)) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }

    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            res.status(404).json({ error: 'Post not found' });
            return;
        }
        if (!sameObjectId(post.author, req.user.id)) {
            res.status(403).json({ error: 'Cannot update another user post' });
            return;
        }

        const updates = pickFields(req.body, ['title', 'body', 'category']);
        if (typeof updates.category !== 'undefined') {
            if (!isValidObjectId(updates.category)) {
                res.status(400).json({ error: 'Invalid category id' });
                return;
            }
            const categoryExists = await Category.exists({ _id: updates.category });
            if (!categoryExists) {
                res.status(400).json({ error: 'Category not found' });
                return;
            }
        }
        if (!Object.keys(updates).length) {
            res.json(post);
            return;
        }

        const result = await Post.findByIdAndUpdate(req.params.id, { $set: updates }, {
            // `new: true` sends back the changed post, not the old version.
            new: true,
            runValidators: true
        });
        if (!result) {
            res.status(404).json({ error: 'Post not found' });
            return;
        }
        res.json(result);
    } catch (err) {
        sendControllerError(res, err);
    }
};

exports.getPosts = async (req, res) => {
    try {
        // Keep list endpoints consistent by sharing the pagination helper.
        const result = await findPage(Post.find({}), req.query);
        res.json(result);
    } catch (err) {
        sendControllerError(res, err);
    }
};

exports.categoryPosts = async (req, res) => {
    if (!isValidObjectId(req.params.category)) {
        res.status(400).json({ error: 'Invalid category id' });
        return;
    }

    try {
        // This endpoint shows filtering: only posts whose category matches the URL.
        const result = await findPage(Post.find({ category: req.params.category }), req.query);
        res.json(result);
    } catch (err) {
        sendControllerError(res, err);
    }
};

exports.deletePost = async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
        res.status(400).json({ error: 'Invalid post id' });
        return;
    }
    if (!req.user || !isValidObjectId(req.user.id)) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }

    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            res.status(404).json({ error: 'Post not found' });
            return;
        }
        if (!sameObjectId(post.author, req.user.id)) {
            res.status(403).json({ error: 'Cannot delete another user post' });
            return;
        }

        const result = await Post.findByIdAndDelete(req.params.id);
        if (!result) {
            res.status(404).json({ error: 'Post not found' });
            return;
        }
        res.json(result);
    } catch (err) {
        sendControllerError(res, err);
    }
};
