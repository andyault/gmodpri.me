var mongoose = require('mongoose'),
	steam = require('../steam-server-status'),
	fs = require('fs'),
	util = require('util');

var config = require('../../config');

var communitySchema = new mongoose.Schema({
	name: String,
	description: String,
	fileext: String,
	website: String,
	owner: String,
	
	comments: [],
	
	servers: [], //new stuff

	/* 
	server schema:
		name: String,
		ip: String,
		port: {type: Number, default: 27015},
		title: String,
		map: String,
		game: String,
		numPlayers: Number,
		maxPlayers: Number,
		error: String
	*/
	
	games: String,
	maps: String,

	added: {type: Date, default: 0},
	updated: {type: Date, default: 0},
	favorites: {type: Number, default: 0}
});

communitySchema.methods.needsUpdate = function() {
	var community = this;
	
	return (Date.now() - community.updated.getTime() > config.communityPollInterval);
}

communitySchema.methods.getInfo = function(num, callback) {
	var community = this;
	
	if(typeof num !== 'number')
		num = 0;
	
	var server = community.servers[num];
	
	if(!server)
		return callback();
	
	steam.getServerStatus(server.ip, server.port, function(newdata) {
		callback(newdata.error, {
			title: newdata.serverName,
			map: newdata.map,
			game: newdata.gameDescription,
			numPlayers: newdata.numberOfPlayers,
			maxPlayers: newdata.maxNumberOfPlayers,

			updated: Date.now()
		});
	});
}

communitySchema.methods.updateServers = function(callback) {
	var community = this;
	
	var done = 0,
		games = "",
		maps = "";
	
	community.servers.forEach(function(server, num) {
		community.getInfo(num, function(err, info) {
			server.error = null;

			if(err) {
				server.error = err;
				server.updated = Date.now();
				server.numPlayers = 0;
			} else {
				for(var key in info) {
					if(info.hasOwnProperty(key)) {
						server[key] = info[key];
					}
				}
				
				games += server.game + ', ';
				maps += server.map + ', ';
			}

			if(++done === community.servers.length) {
				community.markModified('servers');
				
				community.updated = new Date();
				community.games = games;
				community.maps = maps;
				
				community.save(callback);
			}
		});
	});
}

module.exports = mongoose.model('Community', communitySchema);