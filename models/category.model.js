const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// A category is a simple label students can attach to posts.
const CategorySchema = new Schema(
    {
        name: { type: String, required: true },
        // `icon` is optional because not every category needs display metadata.
        icon: { type: String, required: false },
        // Soft deletes hide a category from normal lists without breaking posts
        // that already point at it.
        deletedAt: { type: Date, default: null }
    }
);

module.exports = mongoose.model('Category', CategorySchema);
