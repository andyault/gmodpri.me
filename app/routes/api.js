var express = require('express'),
	steam = require('../steam-server-status');

var User = require('../models/user'),
	Community = require('../models/community');

var config = require('../../config');

var router = express.Router();

router.get('*', function(req, res, next) {
	if(req.headers.host == 'api.gmodpri.me')
		req.url = '/api' + req.url;
	
	next();
});

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

var servers = {}

router.get('/api/server/:ip/:port?/:force?', function(req, res) {
	req.params.port = req.params.port || 27015;
	req.params.force = req.params.force || '';
	
	var force = req.params.port.toString().toLowerCase() == 'force';
	
	if(force || req.params.force.toString().toLowerCase() == 'force') {
		if(force)
			req.params.port = 27015;
		
		force = true;
	}
	
	var full = req.params.ip + ':' + req.params.port;
	var server = servers[full]
	
	if(!server) {
		server = servers[full] = {
			updated: 0,
			data: {}
		}
	}
	
	var now = Date.now();
	
	if(force || (now - server.updated) > config.communityPollInterval) {
		steam.getServerStatus(req.params.ip, req.params.port, function(data) {
			server.updated = now;
			server.data = data;
			
			res.json(data);
		});
	} else
		res.json(server.data);
});

module.exports = router;