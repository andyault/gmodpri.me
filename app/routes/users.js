var express = require('express');

var User = require('../models/user');

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

		userdata.save(function(err, saved) {
			if(handleError(err, req, res))
				return

			res.json(saved);
		});
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
			http.get('http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?' +
					 'key=' + config.apiKey + '&' +
					 'steamids=' + req.params.id,
				function(steamRes) {
					steamRes.on('data', function(chunk) {
						var json = JSON.parse(chunk);
						var data = json.response.players[0];

						if(!data || userdata.id !== data.steamid) { //vulnerability maybe?
							res.end();
							return
						}

						userdata.displayName = data.personaname;
						userdata.avatar = data.avatarfull;
						userdata.updated = Date.now();

						userdata.save(function(err) {
							if(err)
								throw err;

							res.json(userdata);
						});
					});
				}
			);
		} else {
			res.json(userdata);
		}
	});
});

module.exports = router;