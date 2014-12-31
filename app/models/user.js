var mongoose = require('mongoose'),
	http = require('http');

var config = require('../../config');

var userSchema = new mongoose.Schema({
	id: String,
    displayName: String,
	avatar: String,
	
	firstSeen: {type: Date, default: 0},
	lastSeen: {type: Date, default: 0},

	comments: [],
	favorites: [], //would love for this to be an object, but nope
	communities: [],
	activity: [],
	notifications: [],
    
    updated: {type: Date, default: 0},
    error: String
});

userSchema.methods.needsUpdate = function() {
	var user = this;
	
	return (Date.now() - user.updated.getTime() > config.userPollInterval);
}

userSchema.methods.getInfo = function(callback) {
	var user = this;
	
	var timeout = function(err) {
		//suppress I guess, steam api probably down
		
		if(!err || err.code !== 'ECONNRESET') {
			req.abort(); //reset the connection
			callback();
		}
	}
	
	var req = http.get('http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?' +
			 'key=' + config.apiKey + '&' +
			 'steamids=' + user.id,
		function(steamRes) {
			steamRes.on('data', function(chunk) {
				var json = JSON.parse(chunk);
				var data = json.response.players[0];
				
				callback(data);
			});
		}
	).on('error', timeout);
	
	req.setTimeout(config.userPollTimeout, timeout);
}

userSchema.methods.updateInfo = function(callback) {
	var user = this;
	
	user.getInfo(function(data) {
		if(!data || data.steamid !== user.id) {
			callback();
			return
		}
		
		user.displayName = data.personaname;
		user.avatar = data.avatarfull;
		user.updated = Date.now();

		user.save(callback);
	});
}

module.exports = mongoose.model('User', userSchema);