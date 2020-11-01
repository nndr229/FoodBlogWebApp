// body-parser is used to get data out of the form

// Initializations (APP.CONFIG)
const express = require('express'),
	methodOverride = require('method-override'),
	expressSanitizer = require('express-sanitizer'),
	bodyParser = require('body-parser'),
	mongoose = require('mongoose'),
	Blog = require('./models/blog'),
	flash = require('connect-flash'),
	Comment = require('./models/comments'),
	passport = require('passport'),
	sanitizeHTML = require('sanitize-html'),
	LocalStrategy = require('passport-local'),
	User = require('./models/user'),
	app = express(),
	async = require('async'),
	nodemailer = require('nodemailer'),
	crypto = require('crypto'),
	multer = require('multer'),
	cloudinary = require('cloudinary'),
	Notification = require('./models/notification'),
	CommentNotification = require('./models/commentNotification'),
	FollowerNotification = require('./models/followerNotification'),
	mongoSanitize = require('express-mongo-sanitize');

// 'mongodb://localhost/restful_blog_app'
mongoose
	.connect(process.env.DATABASEURL, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useFindAndModify: false,
	})
	.then(() => console.log('Connected to DB!'))
	.catch((error) => console.log(error.message));

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressSanitizer());
app.use(methodOverride('_method'));
app.use(flash());
//Passport Config
app.use(
	require('express-session')({
		secret: 'This is the secret password for the Blog App',
		resave: false,
		saveUninitialized: false,
	})
);

app.use(passport.initialize());
app.use(passport.session());
app.use(mongoSanitize());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

let createBlog = (title, image, body) => {
	Blog.create({ title: title, image: image, body: body }, (err, blog) => {
		if (err) {
			console.log('There was an error!');
			console.log(err);
		} else {
			console.log('Inserting new blog to db');
			console.log(blog);
		}
	});
};

app.use(async (req, res, next) => {
	res.locals.currentUser = req.user;
	res.locals.sanitizeHTML = require('sanitize-html');
	if (req.user) {
		try {
			let user = await User.findById(req.user._id)
				.populate('notifications', null, { isBlogRead: false })
				.exec();
			res.locals.notifications = user.notifications.reverse();
			let userComments = await User.findById(req.user._id)
				.populate('commentNotifications', null, { isCommentRead: false })
				.exec();
			res.locals.commentNotifications = userComments.commentNotifications.reverse();

			let userFollowers = await User.findById(req.user._id)
				.populate('followerNotifications', null, { isFollowerSeen: false })
				.exec();
			res.locals.followerNotifications = userFollowers.followerNotifications.reverse();
		} catch (err) {
			console.log(err.message);
		}
	}
	res.locals.error = req.flash('error');
	res.locals.success = req.flash('success');
	next();
});

let isLoggedIn = (req, res, next) => {
	if (req.isAuthenticated()) {
		return next();
	}
	req.flash('error', 'You need to be logged in to do that.');
	res.redirect('/login');
};

let checkBlogOwnership = (req, res, next) => {
	if (req.isAuthenticated()) {
		Blog.findById(req.params.id, (err, foundBlog) => {
			if (err || !foundBlog) {
				req.flash('error', 'Blog not found');
				res.redirect('/blogs');
			} else {
				//check if the blog belongs to the user that is logged in
				if (foundBlog.author.id.equals(req.user._id) || req.user.isAdmin) {
					next();
				} else {
					req.flash('error', "You don't have permission to do that.");
					res.redirect('/blogs');
				}
			}
		});
	} else {
		req.flash('error', "You don't have permission to do that.");
		res.redirect('/blogs');
	}
};
let checkCommentOwnership = (req, res, next) => {
	if (req.isAuthenticated()) {
		Comment.findById(req.params.comment_id, (err, foundComment) => {
			if (err || !foundComment) {
				req.flash('error', 'Something went wrong!');
				res.redirect('back');
			} else {
				//check if the blog belongs to the user that is logged in
				if (foundComment.author.id.equals(req.user._id) || req.user.isAdmin) {
					next();
				} else {
					req.flash('error', "You don't have permission to do that");
					res.redirect('back');
				}
			}
		});
	} else {
		req.flash('error', "You don't have permission to do that");
		res.redirect('back');
	}
};
let checkProfileOwnership = (req, res, next) => {
	if (req.isAuthenticated()) {
		User.findById(req.params.id, (err, foundUser) => {
			if (err) {
				req.flash('error', 'Something went wrong!');
				res.redirect('back');
			} else {
				if (!foundUser) {
					req.flash('error', 'User not found.');
					return res.redirect('back');
				}
				//check if the blog belongs to the user that is logged in
				if (foundUser._id.equals(req.user._id) || req.user.isAdmin) {
					next();
				} else {
					req.flash('error', "You don't have permission to do that");
					res.redirect('back');
				}
			}
		});
	} else {
		req.flash('error', "You don't have permission to do that");
		res.redirect('back');
	}
};

// Cloudinary

let storage = multer.diskStorage({
	filename: (req, file, callback) => {
		callback(null, Date.now() + file.originalname);
	},
});
let imageFilter = (req, file, cb) => {
	// accept image files only
	if (!file.originalname.match(/\.(jpg|jpeg|png|gif|jfif)$/i)) {
		return cb(new Error('Only image files are allowed!'), false);
	}
	cb(null, true);
};
let upload = multer({ storage: storage, fileFilter: imageFilter });

cloudinary.config({
	cloud_name: 'dswdml3yx',
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});
// First test blog post inserted to DB

// createBlog(
// 	'Test Blog',
// 	'https://images.unsplash.com/photo-1599113234792-18621e4f9f05?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1050&q=80',
// 	'Hello This is a Blog Post!'
// );

// RESTFUL ROUTES..
app.get('/', (req, res) => {
	res.redirect('/blogs');
});

//(1) INDEX -> /blogs GET
app.get('/blogs', (req, res) => {
	let noMatch = null;
	if (req.query.search) {
		req.query.search = req.sanitize(req.query.search);
		req.query.search = sanitizeHTML(req.query.search, {
			allowedTags: [],
		});
		const regex = new RegExp(escapeRegex(req.query.search), 'gi');
		Promise.all([Blog.find({ title: regex }), User.find({ username: regex })])
			.then((results) => {
				const [foundBlogs, foundUsers] = results;

				if (foundBlogs.length < 1 && foundUsers.length < 1) {
					req.flash('error', 'No Users/Blogs match your search');
					res.redirect('/blogs');
				} else if (foundBlogs.length > 0 || foundUsers.length > 0) {
					for (let i = 0; i < foundBlogs.length; i++) {
						const clean = sanitizeHTML(foundBlogs[i].body, {
							allowedTags: ['h3', 'p', 'strong', 'br', 'caption'],
						});
						foundBlogs[i].body = clean;
						console.log(foundBlogs[i].body);
					}
					res.render('index', { blogs: foundBlogs, users: foundUsers });
				}
			})
			.catch((err) => {
				console.error('Something went wrong', err);
			});
	} else {
		Blog.find({}, (err, blogs) => {
			if (err) {
				console.log('There was an Error!');
				console.log(err);
			} else {
				for (let i = 0; i < blogs.length; i++) {
					const clean = sanitizeHTML(blogs[i].body, {
						allowedTags: ['h3', 'p', 'strong', 'br', 'caption'],
					});
					blogs[i].body = clean;
					console.log(blogs[i].body);
				}
				users = [];
				res.render('index', { blogs: blogs, users: users });
			}
		}).sort({ created: -1 });
	}
});

// (2) NEW ROUTE -> /blogs/new  GET
app.get('/blogs/new', isLoggedIn, (req, res) => {
	res.render('blog/new');
});

// (3) CREATE ROUTE -> /blogs  POST
app.post('/blogs', isLoggedIn, upload.single('image'), async function (
	req,
	res
) {
	req.body.blog.body = req.sanitize(req.body.blog.body);
	// console.log(`REQ.BODY.BLOG.IMAGE = ${req.body.blog.image === ''}`);
	if (req.body.blog.image === '') {
		cloudinary.uploader.upload(req.file.path, async (result) => {
			// add cloudinary url for the image to the blog object under image property
			req.body.blog.image = result.secure_url;
			req.body.blog.imageId = result.public_id;
			// add author to blog
			req.body.blog.author = {
				id: req.user._id,
				username: req.user.username,
			};
			try {
				let blog = await Blog.create(req.body.blog);
				let user = await User.findById(req.user._id)
					.populate('followers')
					.exec();
				let newNotification = {
					username: req.user.username,
					blogId: blog.id,
				};
				for (const follower of user.followers) {
					let notification = await Notification.create(newNotification);
					follower.notifications.push(notification);
					follower.save();
				}

				res.redirect(`/blogs/${blog.id}`);
			} catch (err) {
				req.flash('error', err.message);
				res.redirect('back');
			}
		});
	} else {
		let newBlog = req.body.blog;
		newBlog.author = {
			id: req.user._id,
			username: req.user.username,
		};
		try {
			let blog = await Blog.create(req.body.blog);
			let user = await User.findById(req.user._id).populate('followers').exec();
			let newNotification = {
				username: req.user.username,
				blogId: blog.id,
			};
			for (const follower of user.followers) {
				let notification = await Notification.create(newNotification);
				follower.notifications.push(notification);
				follower.save();
			}

			//redirect back to campgrounds page
			res.redirect(`/blogs/${blog.id}`);
		} catch (err) {
			req.flash('error', err.message);
			res.redirect('back');
		}
	}
});

//(4) SHOW -> /blogs/:id  GET
app.get('/blogs/:id', (req, res) => {
	Blog.findById(req.params.id)
		.populate('comments')
		.exec((err, foundBlog) => {
			if (err || !foundBlog) {
				req.flash('error', "That blog doesn't exist.");
				res.redirect('/blogs');
			} else {
				res.render('blog/show', { blog: foundBlog });
			}
		});
});

//(5) EDIT -> /blogs/:id/edit  GET
app.get('/blogs/:id/edit', checkBlogOwnership, (req, res) => {
	Blog.findById(req.params.id, (err, foundBlog) => {
		if (err) {
			req.flash('error', "You don't have permission to do that");
			res.redirect('/blogs');
		} else {
			res.render('blog/edit', { blog: foundBlog });
		}
	});
});

//(6) UPDATE -> /blogs/:id  PUT
app.put(
	'/blogs/:id',
	checkBlogOwnership,
	upload.single('image'),
	(req, res) => {
		req.body.blog.body = req.sanitize(req.body.blog.body);
		console.log(req.file);
		if (req.file !== undefined) {
			Blog.findById(req.params.id, async function (err, foundBlog) {
				if (err) {
					req.flash('error', 'Something went wrong!');
					res.redirect('back');
				} else {
					if (req.file) {
						try {
							if (foundBlog.imageId) {
								await cloudinary.uploader.destroy(foundBlog.imageId);
							}
							var result = await cloudinary.v2.uploader.upload(req.file.path);
							foundBlog.imageId = result.public_id;
							foundBlog.image = result.secure_url;
						} catch (err) {
							req.flash('error', err.message);
							return res.redirect('back');
						}
					}
					foundBlog.title = req.body.blog.title;
					foundBlog.body = req.body.blog.body;
					foundBlog.save();
					req.flash('success', 'Successfully Updated!');
					res.redirect('/blogs/' + foundBlog._id);
				}
			});
		} else {
			Blog.findByIdAndUpdate(
				req.params.id,
				req.body.blog,
				(err, updatedBlog) => {
					if (err) {
						res.redirect('/blogs');
					} else {
						res.redirect(`/blogs/${req.params.id}`);
					}
				}
			);
		}
	}
);

//(6) DESTROY -> /blogs/:id  DELETE
app.delete('/blogs/:id', checkBlogOwnership, isLoggedIn, (req, res) => {
	Notification.findOne({
		blogId: req.params.id,
	}).remove(function (err, results) {
		if (err) {
			console.log(err);
		}
	});
	Blog.findById(req.params.id, async (err, foundBlog) => {
		if (foundBlog.imageId) {
			try {
				await cloudinary.uploader.destroy(foundBlog.imageId);
				foundBlog.remove();
				req.flash('success', 'Blog deleted successfully!');
				res.redirect('/blogs');
			} catch (err) {
				if (err) {
					req.flash('error', 'Something went wrong');
					return res.redirect('back');
				}
			}
		} else {
			Blog.findByIdAndRemove(req.params.id, (err) => {
				if (err) {
					console.log(err);
					res.redirect('/blogs');
				} else {
					res.redirect('/blogs');
				}
			});
		}
	});
});

// Feed
app.get('/blogs/:id/feed', isLoggedIn, (req, res) => {
	User.findById(req.params.id, (err, user) => {
		if (err) {
			console.log(err);
		} else {
			if (user.isFollowerOf.length === 0) {
				req.flash('error', "You don't follow anyone Yet!");
				return res.redirect('/blogs');
			}
			foundBlogs = [];
			console.log(user);
			for (let i = 0; i < user.isFollowerOf.length; i++) {
				Blog.find({ 'author.id': user.isFollowerOf[i] }, (err, foundBlog) => {
					if (err) {
						console.log('There was an Error!');
						console.log(err);
						return res.redirect('back');
					} else {
						foundBlogs.push(foundBlog);
						if (i === user.isFollowerOf.length - 1) {
							let blogsToPush = [];
							for (let i = 0; i < foundBlogs.length; i++) {
								for (let j = 0; j < foundBlogs[i].length; j++) {
									const cleaned = sanitizeHTML(foundBlogs[i][j].body, {
										allowedTags: ['h3', 'p', 'strong', 'br', 'caption'],
									});
									foundBlogs[i][j].body = cleaned;
									blogsToPush.push(foundBlogs[i][j]);
								}
								if (i === foundBlogs.length - 1) {
									for (let i = 0; i < blogsToPush.length; i++) {
										for (let j = i + 1; j < blogsToPush.length; j++) {
											if (blogsToPush[i].created < blogsToPush[j].created) {
												let temp = blogsToPush[j];
												blogsToPush[j] = blogsToPush[i];
												blogsToPush[i] = temp;
											}
										}
									}
									res.render('feed/index', { blogsToPush });
								}
							}
						}
					}
				});
			}
		}
	});
});
// COMMENTS
app.get('/blogs/:id/comments/new', isLoggedIn, (req, res) => {
	Blog.findById(req.params.id, (err, blog) => {
		if (err) {
			console.log(err);
		} else {
			res.render('comments/new', { blog: blog });
		}
	});
});

app.post('/blogs/:id/comments', isLoggedIn, (req, res) => {
	req.body.comment.body = req.sanitize(req.body.comment.body);
	Blog.findById(req.params.id, async (err, blog) => {
		if (err) {
			console.log(err);
			res.redirect('/blogs');
		} else {
			try {
				let comment = await Comment.create(req.body.comment);
				comment.author.id = req.user._id;
				comment.author.username = req.user.username;
				//save comment
				let user = await User.findById(blog.author.id);
				console.log(user.username);
				console.log(user.commenters);
				user.commenters.push(req.user._id);
				console.log(user.commenters);
				user.save();

				if (req.user.username !== blog.author.username) {
					let newCommentNotification = {
						username: req.user.username,
						CommentId: comment.id,
						BlogId: req.params.id,
						BlogTitle: blog.title,
					};
					let userF = await User.findById(blog.author.id);

					let notification = await CommentNotification.create(
						newCommentNotification
					);
					userF.commentNotifications.push(notification);

					userF.save();
				}
				comment.save();
				blog.comments.push(comment);
				blog.save();

				req.flash('success', 'Successfully added a new comment!');
				res.redirect(`/blogs/${blog._id}`);
			} catch (err) {
				req.flash('error', err.message);
				res.redirect('back');
			}
		}
	});
});

// Comment edit
app.get(
	'/blogs/:id/comments/:comment_id/edit',
	checkCommentOwnership,
	(req, res) => {
		Comment.findById(req.params.comment_id, (err, foundComment) => {
			if (err || !foundComment) {
				req.flash('error', 'You do not have permission to do that!');
				res.redirect('back');
			} else {
				res.render('comments/edit', {
					blog_id: req.params.id,
					comment: foundComment,
				});
			}
		});
	}
);

// comment update
app.put(
	'/blogs/:id/comments/:comment_id',
	checkCommentOwnership,
	(req, res) => {
		req.body.comment.body = req.sanitize(req.body.comment.body);
		Comment.findByIdAndUpdate(
			req.params.comment_id,
			req.body.comment,
			(err, updatedComment) => {
				if (err) {
					res.redirect('back');
				} else {
					res.redirect(`/blogs/${req.params.id}`);
				}
			}
		);
	}
);

// comment destroy

app.delete(
	'/blogs/:id/comments/:comment_id',
	checkCommentOwnership,
	(req, res) => {
		CommentNotification.findOne({
			CommentId: req.params.comment_id,
		}).remove(function (err, results) {
			if (err) {
				console.log(err);
			}
		});
		Comment.findByIdAndRemove(req.params.comment_id, (err) => {
			if (err) {
				console.log(err);
				res.redirect('back');
			} else {
				res.redirect(`/blogs/${req.params.id}`);
			}
		});
	}
);

// Register Route
app.get('/register', (req, res) => {
	res.render('register');
});

app.post('/register', upload.single('image'), (req, res) => {
	req.body.username = req.sanitize(req.body.username);
	req.body.lastName = req.sanitize(req.body.lastName);
	req.body.firstName = req.sanitize(req.body.firstName);
	req.body.email = req.sanitize(req.body.email);
	req.body.adminCode = req.sanitize(req.body.adminCode);

	if (req.file !== undefined) {
		cloudinary.uploader.upload(req.file.path, (result) => {
			let newUser = {
				username: req.body.username,
				firstName: req.body.firstName,
				lastName: req.body.lastName,
				email: req.body.email,
				image: result.secure_url,
				imageId: result.public_id,
			};
			if (req.body.adminCode === 'secretblogcode2294toenternithinsapp') {
				newUser.isAdmin = true;
			}

			User.register(newUser, req.body.password, (err, user) => {
				if (err) {
					req.flash('error', err.message);
					console.log(err);
					res.redirect('register');
				} else {
					passport.authenticate('local')(req, res, () => {
						req.flash('success', `Welcome to the Food Blog ${user.username}`);
						res.redirect('/blogs');
					});
				}
			});
		});
	} else {
		let newUser = {
			username: req.body.username,
			firstName: req.body.firstName,
			lastName: req.body.lastName,
			email: req.body.email,
		};
		if (req.body.adminCode === 'secretblogcode2294toenternithinsapp') {
			newUser.isAdmin = true;
		}
		User.register(newUser, req.body.password, (err, user) => {
			if (err) {
				req.flash('error', err.message);
				console.log(err);
				res.redirect('register');
			} else {
				passport.authenticate('local')(req, res, () => {
					req.flash('success', `Welcome to the Food Blog ${user.username}`);
					res.redirect('/blogs');
				});
			}
		});
	}
});

// login route
// login routes
app.get('/login', (req, res) => {
	res.render('login');
});

app.post(
	'/login',
	passport.authenticate('local', {
		successRedirect: '/blogs',
		failureRedirect: '/login',
	}),
	(req, res) => {}
);

// logout route
app.get('/logout', (req, res) => {
	req.logout();
	req.flash('success', 'You Logged Out!');
	res.redirect('/blogs');
});

// forgot password
app.get('/forgot', function (req, res) {
	res.render('forgot');
});

app.post('/forgot', function (req, res, next) {
	async.waterfall(
		[
			function (done) {
				crypto.randomBytes(20, function (err, buf) {
					let token = buf.toString('hex');
					done(err, token);
				});
			},
			function (token, done) {
				req.body.email = req.sanitize(req.body.email);
				User.findOne({ email: req.body.email }, function (err, user) {
					if (!user) {
						req.flash('error', 'No account with that email address exists.');
						return res.redirect('/forgot');
					}

					user.resetPasswordToken = token;
					user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

					user.save(function (err) {
						done(err, token, user);
					});
				});
			},
			function (token, user, done) {
				let smtpTransport = nodemailer.createTransport({
					service: 'Gmail',
					auth: {
						user: 'nithinsblogapp229@gmail.com',
						pass: process.env.GMAILPW,
					},
				});
				let mailOptions = {
					to: user.email,
					from: 'nithinsblogapp229@gmail.com',
					subject: 'The Food Blog Password Reset',
					text:
						'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
						'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
						'http://' +
						req.headers.host +
						'/reset/' +
						token +
						'\n\n' +
						'If you did not request this, please ignore this email and your password will remain unchanged.\n',
				};
				smtpTransport.sendMail(mailOptions, function (err) {
					console.log('mail sent');
					req.flash(
						'success',
						'An e-mail has been sent to ' +
							user.email +
							' with further instructions.'
					);
					done(err, 'done');
				});
			},
		],
		function (err) {
			if (err) return next(err);
			res.redirect('/forgot');
		}
	);
});

app.get('/reset/:token', function (req, res) {
	User.findOne(
		{
			resetPasswordToken: req.params.token,
			resetPasswordExpires: { $gt: Date.now() },
		},
		function (err, user) {
			if (!user) {
				req.flash('error', 'Password reset token is invalid or has expired.');
				return res.redirect('/forgot');
			}
			res.render('reset', { token: req.params.token });
		}
	);
});

app.post('/reset/:token', function (req, res) {
	async.waterfall(
		[
			function (done) {
				User.findOne(
					{
						resetPasswordToken: req.params.token,
						resetPasswordExpires: { $gt: Date.now() },
					},
					function (err, user) {
						if (!user) {
							req.flash(
								'error',
								'Password reset token is invalid or has expired.'
							);
							return res.redirect('back');
						}
						req.body.password = req.sanitize(req.body.password);
						req.body.confirm = req.sanitize(req.body.confirm);
						if (req.body.password === req.body.confirm) {
							user.setPassword(req.body.password, function (err) {
								user.resetPasswordToken = undefined;
								user.resetPasswordExpires = undefined;

								user.save(function (err) {
									req.logIn(user, function (err) {
										done(err, user);
									});
								});
							});
						} else {
							req.flash('error', 'Passwords do not match.');
							return res.redirect('back');
						}
					}
				);
			},
			function (user, done) {
				let smtpTransport = nodemailer.createTransport({
					service: 'Gmail',
					auth: {
						user: 'nithinsblogapp229@gmail.com',
						pass: process.env.GMAILPW,
					},
				});
				let mailOptions = {
					to: user.email,
					from: 'nithinsblogapp229@gmail.com',
					subject: 'Your password has been changed',
					text:
						'Hello,\n\n' +
						'This is a confirmation that the password for your account ' +
						user.email +
						' has just been changed.\n',
				};
				smtpTransport.sendMail(mailOptions, function (err) {
					req.flash('success', 'Success! Your password has been changed.');
					done(err);
				});
			},
		],
		function (err) {
			res.redirect('/blogs');
		}
	);
});

// user profile
app.get('/users/:id', async (req, res) => {
	User.findById(req.params.id, (err, foundUser) => {
		if (err) {
			req.flash('error', 'Something went wrong');
			res.redirect('/blogs');
		} else {
			Blog.find()
				.where('author.id')
				.equals(foundUser._id)
				.exec(async (err, blogs) => {
					if (err) {
						req.flash('error', 'Something went wrong');
						res.redirect('/blogs');
					} else {
						try {
							let userFollowers = await User.findById(req.params.id)
								.populate('followers')
								.exec();
							res.render('users/show', {
								user: foundUser,
								blogs: blogs,
								userFollowers: userFollowers,
							});
						} catch (err) {
							req.flash('error', err.message);
							return res.redirect('back');
						}
					}
				});
		}
	});
});

app.get('/follow/:id', isLoggedIn, async function (req, res) {
	try {
		let user = await User.findById(req.params.id);
		for (let i = 0; i < user.followers.length; i++) {
			if (user.followers[i].equals(req.user._id)) {
				req.flash('error', 'You already follow ' + user.username + '!');
				return res.redirect('/users/' + req.params.id);
			}
		}
		user.followers.push(req.user._id);
		user.save();
		req.flash('success', 'Successfully followed ' + user.username + '!');

		let curUser = await User.findById(req.user._id);
		curUser.isFollowerOf.push(req.params.id);
		curUser.save();

		let userF = await User.findById(req.params.id);

		if (req.user.username !== userF.username) {
			let newFollowerNotification = {
				username: req.user.username,
				FollowerId: req.user._id,
			};

			let notification = await FollowerNotification.create(
				newFollowerNotification
			);
			userF.followerNotifications.push(notification);

			userF.save();
		}

		res.redirect('/users/' + req.params.id);
	} catch (err) {
		req.flash('error', err.message);
		res.redirect('back');
	}
});

app.get('/unfollow/:id', isLoggedIn, async function (req, res) {
	try {
		let user = await User.findById(req.params.id);

		user.followers.pull(req.user._id);
		user.save();

		let curUser = await User.findById(req.user._id);
		curUser.isFollowerOf.pull(req.params.id);
		curUser.save();

		req.flash('success', 'Successfully unfollowed ' + user.username + '!');
		return res.redirect('/users/' + req.params.id);
	} catch (err) {
		req.flash('error', err.message);
		res.redirect('back');
	}
});

// view all notifications add all notifications seen at once
app.get('/notifications', isLoggedIn, async function (req, res) {
	try {
		let user = await User.findById(req.user._id)
			.populate({
				path: 'notifications',
				options: { sort: { _id: -1 } },
			})
			.exec();
		let allNotifications = user.notifications;

		allNotifications.forEach((notification) => {
			notification.isBlogRead = true;
			notification.save();
		});

		let commentUser = await User.findById(req.user._id)
			.populate({
				path: 'commentNotifications',
				options: { sort: { _id: -1 } },
			})
			.exec();
		let allCommentNotifications = commentUser.commentNotifications;
		allCommentNotifications.forEach((notification) => {
			notification.isCommentRead = true;
			notification.save();
		});

		let followerUser = await User.findById(req.user._id)
			.populate({
				path: 'followerNotifications',
				options: { sort: { _id: -1 } },
			})
			.exec();
		let allFollowerNotifications = followerUser.followerNotifications;

		allFollowerNotifications.forEach((notification) => {
			notification.isFollowerSeen = true;
			notification.save();
		});

		res.render('notifications/index', {
			allNotifications,
			allCommentNotifications,
			allFollowerNotifications,
		});
	} catch (err) {
		req.flash('error', err.message);
		res.redirect('back');
	}
});

// handle notification
app.get('/notifications/:id', isLoggedIn, async function (req, res) {
	try {
		let notification = await Notification.findById(req.params.id);
		notification.isBlogRead = true;
		notification.save();
		res.redirect(`/blogs/${notification.blogId}`);
	} catch (err) {
		req.flash('error', err.message);
		res.redirect('back');
	}
});

app.get('/commentNotifications/:id', isLoggedIn, async function (req, res) {
	try {
		let commentNotification = await CommentNotification.findById(req.params.id);
		commentNotification.isCommentRead = true;
		commentNotification.save();
		res.redirect(`/blogs/${commentNotification.BlogId}`);
	} catch (err) {
		req.flash('error', err.message);
		res.redirect('back');
	}
});

app.get('/followerNotifications/:id', isLoggedIn, async function (req, res) {
	try {
		let followerNotification = await FollowerNotification.findById(
			req.params.id
		);
		followerNotification.isFollowerSeen = true;
		followerNotification.save();
		console.log(`/users/${followerNotification.FollowerId}`);
		res.redirect(`/users/${followerNotification.FollowerId}`);
	} catch (err) {
		console.log(err);
		req.flash('error', err.message);
		res.redirect('back');
	}
});

//edit user profile
app.get('/users/:id/edit', checkProfileOwnership, (req, res) => {
	User.findById(req.params.id, (err, foundUser) => {
		if (err) {
			res.redirect('back');
		} else {
			res.render('users/edit', { user: foundUser });
		}
	});
});

// update user profile
app.put(
	'/users/:id',
	checkProfileOwnership,
	upload.single('image'),
	(req, res) => {
		req.body.user.body = req.sanitize(req.body.user.body);
		if (req.file !== undefined) {
			User.findById(req.params.id, async function (err, foundUser) {
				if (err) {
					req.flash('error', 'Something went wrong!');
					res.redirect('back');
				} else {
					if (req.file) {
						try {
							if (foundUser.imageId) {
								await cloudinary.uploader.destroy(foundUser.imageId);
							}
							var result = await cloudinary.v2.uploader.upload(req.file.path);
							foundUser.imageId = result.public_id;
							foundUser.image = result.secure_url;
						} catch (err) {
							req.flash('error', err.message);
							return res.redirect('back');
						}
					}
					foundUser.firstName = req.body.user.firstName;
					foundUser.lastName = req.body.user.lastName;
					foundUser.email = req.body.user.email;
					foundUser.username = req.body.user.username;
					if (req.body.adminCode === 'secretblogcode2294toenternithinsapp') {
						foundUser.isAdmin = true;
					}
					foundUser.save();
					req.flash('success', 'Successfully Updated!');
					res.redirect(`/users/${req.params.id}`);
				}
			});
		} else {
			if (req.body.adminCode === 'secretblogcode2294toenternithinsapp') {
				req.body.user.isAdmin = true;
			}
			User.findByIdAndUpdate(
				req.params.id,
				req.body.user,
				(err, updatedUser) => {
					if (err) {
						res.redirect('back');
					} else {
						res.redirect(`/users/${req.params.id}`);
					}
				}
			);
		}
	}
);

app.get('/users/:id/followers', isLoggedIn, (req, res) => {
	//find user.followers generate a list of users with username image and user url and render the webpage
	User.findById(req.params.id, (err, foundUser) => {
		if (err) {
			res.redirect('back');
		} else {
			let followerList = [];
			if (foundUser.followers.length === 0) {
				req.flash('success', 'This user has no followers yet');
				return res.redirect('back');
			}

			for (let i = foundUser.followers.length - 1; i >= 0; i--) {
				User.findById(foundUser.followers[i], (err, foundFollower) => {
					if (err) {
						console.log(err);
					} else {
						followerList.push(foundFollower);
						if (i === 0) {
							res.render('users/followers', {
								user: foundUser,
								followerList: followerList,
							});
						}
					}
				});
			}
		}
	});
});

function escapeRegex(text) {
	return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

app.listen(process.env.PORT || 3000, () => {
	console.log('Blog app server is online!');
});
