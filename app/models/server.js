var mongoose = require('mongoose'),
	steam = require('../steam-server-status');

var config = require('../../config');

var serverSchema = new mongoose.Schema({
	name: String,
	description: String,
	fileext: String,
	website: String,
	servers: [],
	owner: String,
	
	comments: [],

	title: String,
	map: String,
	game: String,
	numPlayers: Number,
	maxPlayers: Number,

	added: {type: Date, default: 0},
	updated: {type: Date, default: 0},
	error: String,
	favorites: {type: Number, default: 0}
});

serverSchema.methods.needsUpdate = function(callback) {
	return (Date.now() - this.updated.getTime() > config.serverPollInterval);
}

serverSchema.methods.getInfo = function(cb) {
	steam.getServerStatus(this.ip, this.port, function(newdata) {
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

module.exports = mongoose.model('Server', serverSchema);