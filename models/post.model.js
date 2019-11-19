const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PostSchema = new Schema({
    title: { type: String, required: true },
    body: { type: String, required: true },
    category: { type: Schema.Types.ObjectId, required: true, ref: "Category", index: true },
    author: { type: Schema.Types.ObjectId, required: true, ref: "User", index: true },
});

module.exports = mongoose.model("Post", PostSchema);