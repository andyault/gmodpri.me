var express = require('express');

var User = require('../models/user'),
	Community = require('../models/community');

var router = express.Router();

router.get('/api/communities/', function(req, res) {
	var special = {
		amt: +(req.query.amt || 10),
		start: Math.max(+(req.query.start || 0), 0),
		sortBy: req.query.sortBy || 'added',
		reverse: !!req.query.reverse
	}

	var search = {};

	for(var key in req.query) {
		if(req.query.hasOwnProperty(key) && !special.hasOwnProperty(key)) {
			search[key] = new RegExp('.*' + req.query[key].replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&") + '.*', 'i');
		}
	}

	Community.find(search, function(err, communities) {
		if(err)
			throw err;

		communities.sort(function(a, b) {
			var field = special.sortBy;
			var x = (a[field] || 0);
			var y = (b[field] || 0);
			var ret = x < y ? 1 : x > y ? -1 : 0;

			ret *= special.reverse ? -1 : 1;

			return ret;
		});

		res.json({
			amt: communities.length,
			results: communities.slice(special.start, special.start + special.amt).map(function(v) {return v._id})
		});
	});
});

router.get('/api/community/:id', function(req, res) {
	Community.findOne({_id: req.params.id}, function(err, community) {
		if(err)
			throw err;

		if(!community) {
			res.end();
			return
		}

		if(community.needsUpdate()) {
			community.updateServers(function(err, saved) {
				res.json(saved);
			});
		} else {
			res.json(community);
		}
	});
});
	
router.post('/api/community/:id', function(req, res) {
	if(!req.user) {
		res.end();
		return
	}

	var id = req.params.id;

	Community.findOne({_id: id}, function(err, community) {
		if(err)
			throw err;

		if(!community) { // || server.owner == req.user.id) {
			res.end();
			return
		}

		User.findOne({id: req.user.id}, function(err, userdata) {
			if(err)
				throw err;

			var favorites = JSON.parse(userdata.favorites);

			switch(req.body.act) { //just in case I guess?
				case('fave'):
					if(favorites[id]) {
						delete favorites[id];
						community.favorites--;
					} else {
						favorites[id] = true;
						community.favorites++;
					}

					break
			}
			
			if(req.body.act == 'fave') {
				if(favorites[id]) {
					addActivity(userdata, {
						type: 'fave',
						action: 'add',
						id: id
					});
				}
			}

			userdata.favorites = JSON.stringify(favorites);

			userdata.save();

			community.save();

			res.end();
		});
	});
});
	
router.post('/api/community/:id/comment', function(req, res) {
	if(!req.user) {
		res.end();
		return
	}

	if(!req.body.comment.trim().length) {
		res.end();
		return
	}

	Community.findOne({_id: req.params.id}, function(err, community) {
		if(err)
			throw err;

		if(!community) {
			res.end();
			return
		}

		community.comments.unshift({
			author: req.user.id,
			time: Date.now(),
			comment: req.body.comment.trim(),
			rating: req.body.rating
		});

		community.save();

		User.findOne({id: server.owner}, function(err, user) {
			if(err)
				throw err;

			addNotification(user, {
				type: 'comment',
				label: 'server',
				id: req.params.id
			}, true);
		});

		res.end();
	});
});	
	
router.delete('/api/community/:id', function(req, res) {
	if(!req.user) {
		res.end('/return?msg=log_in&location=' + encodeURIComponent('/login'));
		return
	}

	Community.findOne({_id: req.params.id}, function(err, community) {
		if(err)
			throw err;

		if(!community) {
			res.end();
			return
		}

		if(community.owner !== req.user.id) {
			res.end('/return?msg=not_owner&location=' + encodeURIComponent('/servers/' + server._id));
			return;
		}

		community.remove(function(err, community) {
			if(err)
				throw err;

			User.findOne({id: req.user.id}, function(err, userdata) {
				if(err)
					throw err;

				var idof = userdata.servers.indexOf(server._id);

				while(idof > -1) {
					userdata.servers.splice(idof, 1);

					idof = userdata.servers.indexOf(server._id);
				}

				addActivity(userdata, {
					type: 'server',
					action: 'delete',
					name: community.name
				}, true);
			});

			console.log(' ', 'Community', community.name, 'removed');

			res.end('/return?msg=server_deleted');
		});
	});
});

module.exports = router;