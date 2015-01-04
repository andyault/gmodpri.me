var express = require('express');

var User = require('../models/user'),
	Community = require('../models/community');

var config = require('../../config');

var addActivity = function(user, info, shouldSave) {
	info.time = Date.now();
	
	user.activity.unshift(info);
	
	user.activity = user.activity.slice(0, config.activityLength);
	
	if(shouldSave) {
		user.save();
	}	
}

var addNotification = function(user, info, shouldSave) {
	if(!user) //???
		return
	
	info.unread = true;
	
	user.notifications.unshift(info);
	
	user.notifications = user.notifications.slice(0, 5);
	
	if(shouldSave) {
		user.save();
	}	
}

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
		
		if(special.sortBy == 'random') {
			communities.forEach(function(community) {
				community.random = Math.random();
			});
		}

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
		
		if(special.sortBy == 'random') {
			communities.forEach(function(community) {
				delete community.random;
			});
		}
	});
});

router.get('/api/community/:id', function(req, res) {
	if(!req.params.id) {
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

		if(community.needsUpdate()) {
			community.updateServers(function(err, saved) {
				res.json(saved);
			});
		} else {
			res.json(community);
		}
	});
});
	
router.post('/api/community/:id/fave', function(req, res) {
	if(!req.user) {
		res.end();
		return
	}

	var id = req.params.id;

	Community.findOne({_id: id}, function(err, community) {
		if(err)
			throw err;

		if(!community) {
			res.end();
			return
		}

		User.findOne({id: req.user.id}, function(err, userdata) {
			if(err)
				throw err;

			var favorites = userdata.favorites,
				fave = favorites.indexOf(id);
			
			if(fave > -1) {
				favorites.splice(fave, 1);
				community.favorites--;
				
				addActivity(userdata, {
					type: 'fave',
					action: 'add',
					id: id
				});
			} else {
				favorites.push(id);
				community.favorites++;
			}

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
		
		if(req.body.rating) {
			community.comments.some(function(comment) {
				if(comment.author == req.user.id) {
					if(comment.rating)
						return !(req.body.rating = 0);
				}
			});
		}

		community.comments.unshift({
			author: req.user.id,
			time: Date.now(),
			comment: req.body.comment.trim(),
			rating: req.body.rating
		});
		
		community.markModified('comments');

		community.save();

		User.findOne({id: community.owner}, function(err, user) {
			if(err)
				throw err;

			addNotification(user, {
				type: 'comment',
				label: 'community',
				id: req.params.id
			}, true);
		});

		res.end();
	});
});

router.delete('/api/community/:id/comment/:cid', function(req, res) {
	if(!req.user) {
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
		
		var comment = community.comments[req.params.cid];
		
		if(!comment) {
			res.end();
			return
		}
		
		if(comment.author !== req.user.id) {
			res.end();
			return
		}
		
		community.comments.splice(req.params.cid, 1);
		
		community.markModified('comments');
		
		community.save();
		
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
			res.end('/return?msg=not_owner&location=' + encodeURIComponent('/community/' + community._id));
			return;
		}

		community.remove(function(err, community) {
			if(err)
				throw err;

			User.findOne({id: req.user.id}, function(err, userdata) {
				if(err)
					throw err;

				var idof = userdata.communities.indexOf(community._id);

				while(idof > -1) {
					userdata.communities.splice(idof, 1);

					idof = userdata.communities.indexOf(communities._id);
				}

				addActivity(userdata, {
					type: 'community',
					action: 'delete',
					name: community.name
				}, true);
			});

			console.log(' ', 'Community', community.name, 'removed');

			res.end('/return?msg=community_deleted');
		});
	});
});

module.exports = router;