const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

let UserSchema = new mongoose.Schema({
	username: { type: String, unique: true, required: true },
	password: String,
	isAdmin: { type: Boolean, default: false },
	firstName: String,
	image: String,
	imageId: String,
	email: { type: String, unique: true, required: true },
	resetPasswordToken: String,
	resetPasswordExpires: Date,
	lastName: String,
	notifications: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Notification'
		}
	],
	followers: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		}
	],
	commentNotifications: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'CommentNotification'
		}
	],
	commenters: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		}
	],
	followerNotifications: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'FollowerNotification'
		}
	],
	isFollowerOf: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		}
	]
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', UserSchema);
