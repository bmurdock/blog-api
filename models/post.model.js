const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Posts demonstrate required fields plus relationships to other collections.
const PostSchema = new Schema({
    title: { type: String, required: true },
    body: { type: String, required: true },
    // ObjectId references connect a post to one category and one author.
    // The indexes help MongoDB search efficiently when filtering by either field.
    category: { type: Schema.Types.ObjectId, required: true, ref: "Category", index: true },
    author: { type: Schema.Types.ObjectId, required: true, ref: "User", index: true },
});

module.exports = mongoose.model("Post", PostSchema);
