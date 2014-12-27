var express = require('express'),
	http = require('http');

var User = require('../models/user');

var config = require('../../config');

var addNotification = function(user, info, shouldSave) {
	info.unread = true;
	
	user.notifications.unshift(info);
	
	user.notifications = user.notifications.slice(0, 5);
	
	if(shouldSave) {
		user.save();
	}	
}

var router = express.Router();

router.get('/api/user', function(req, res) {
	res.json(req.user);
});

router.post('/api/clearNotifications', function(req, res) {
	if(!req.user) {
		res.end();
		return
	}

	User.findOne({id: req.user.id}, function(err, userdata) {
		if(err)
			throw err;

		if(!userdata) {
			res.end()
			return
		}

		userdata.notifications.forEach(function(note, k) {
			note.unread = false;
		});

		userdata.markModified('notifications');

		userdata.save(function(err, saved) {
			if(err)
				throw err;

			res.end();
		});
	});
});			

router.post('/api/users/:id/comment', function(req, res) {
	if(!req.user) {
		res.end();
		return
	}

	if(!req.body.comment.trim().length) {
		res.end();
		return
	}

	User.findOne({id: req.params.id}, function(err, userdata) {
		if(err)
			throw err;

		if(!userdata) { // || userdata.id == req.user.id) {
			res.end();
			return
		}

		userdata.comments.unshift({
			author: req.user.id,
			time: Date.now(),
			comment: req.body.comment
		});

		addNotification(userdata, {
			type: 'comment',
			label: 'profile',
			id: req.params.id
		});

		userdata.save();
		
		res.json(userdata);
	});
});		

router.get('/api/userdata/:id?', function(req, res) {
	if(!(req.params.id || req.user)) {
		res.end();
		return
	}

	req.params.id = req.params.id || req.user.id;

	User.findOne({id: req.params.id}, function(err, userdata) {
		if(err)
			throw err;

		if(!userdata) {
			res.end();
			return
		}

		if(userdata.needsUpdate()) {
			userdata.updateInfo(function(err, data) {
				if(err)
					throw err;
				
				res.json(data);
			});
		} else {
			res.json(userdata);
		}
	});
});

module.exports = router;