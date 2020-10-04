let mongoose = require('mongoose');

let notificationSchema = new mongoose.Schema({
	username: String,
	CommentId: String,
	BlogId: String,
	BlogTitle: String,
	isCommentRead: { type: Boolean, default: false }
});

module.exports = mongoose.model('CommentNotification', notificationSchema);
