var mongoose = require('mongoose'),
	steam = require('../steam-server-status');

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

	added: {type: Date, default: 0},
	updated: {type: Date, default: 0},
	favorites: {type: Number, default: 0}
});

communitySchema.methods.needsUpdate = function(cb) {
	//this isn't the best place to do this but it has to be done
	
	if(this.ip && this.port) {
		this.servers.unshift({name: this.name, ip: this.ip, port: this.port});
		
		delete this.ip;
		delete this.port;
		
		this.markModified('servers');
		this.markModified('ip');
		this.markModified('port');
		
		this.save();
	}
	
	return (Date.now() - this.updated.getTime() > config.serverPollInterval);
}

communitySchema.methods.getInfo = function(num, cb) {
	if(typeof num !== 'number')
		num = 0;
	
	if(typeof cb !== 'function')
		cb = function() {};
	
	var server = this.servers[num]
	
	if(!server)
		return cb();
	
	steam.getServerStatus(server.ip, server.port, function(newdata) {
		cb(newdata.error, {
			title: newdata.serverName,
			map: newdata.map,
			game: newdata.gameDescription,
			numPlayers: newdata.numberOfPlayers,
			maxPlayers: newdata.maxNumberOfPlayers,

			updated: Date.now()
		});
	});
}

communitySchema.methods.updateServers = function(num, cb) {
	var done = 0;
	
	for(var i = 0; i < this.servers.length; i++) {
		var server = this.servers[i];
		
		this.getInfo(i, function(err, info) {
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
			}

			this.save(function(err) {
				if(err)
					throw err;
				
				if(++done === this.servers.length) {
					cb();
				}
			});
		});
	};
}

module.exports = mongoose.model('Community', communitySchema);