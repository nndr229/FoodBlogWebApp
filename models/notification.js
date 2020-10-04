let mongoose = require('mongoose');

let notificationSchema = new mongoose.Schema({
	username: String,
	blogId: String,
	isBlogRead: { type: Boolean, default: false }
});

module.exports = mongoose.model('Notification', notificationSchema);
