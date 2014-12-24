var express = require('express');

var User = require('../models/user'),
	Community = require('../models/community');

var router = express.Router();

router.get('/api/info', function(req, res) {
	var now = new Date(),
		ret = {},
		amt = 0,
		len = 3;

	now.setMinutes(now.getMinutes() - 10);

	var addAndCheck = function(key, val) {
		ret[key] = val;

		if(++amt == len) {
			res.json(ret);
		}
	}

	User.find({}, function(err, users) {
		if(err)
			throw err;

		addAndCheck('users', (users ? users.length : 0));
	});

	User.find({lastSeen: {$gt: now}}, function(err, active) {
		if(err)
			throw err;

		addAndCheck('active', (active ? active.length : 0));
	});

	Community.find({}, function(err, communities) {
		if(err)
			throw err;

		addAndCheck('communities', (communities ? communities.length : 0));
	});
});

module.exports = router;