let mongoose = require('mongoose');

let notificationSchema = new mongoose.Schema({
	username: String,
	FollowerId: String,
	isFollowerSeen: { type: Boolean, default: false }
});

module.exports = mongoose.model('FollowerNotification', notificationSchema);
