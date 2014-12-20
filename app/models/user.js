var mongoose = require('mongoose');

var config = require('../../config');

var userSchema = new mongoose.Schema({
	id: String,
    displayName: String,
	avatar: String,
	
	firstSeen: {type: Date, default: 0},
	lastSeen: {type: Date, default: 0},
    
	votes: {type: String, default: '{}'},
	lastVote: {
		time: {type: Date, default: 0},
		server: String
	},

	comments: [],
	favorites: {type: String, default: '{}'},
	servers: [],
	activity: [],
    
    updated: {type: Date, default: 0},
    error: String
});

userSchema.methods.needsUpdate = function(callback) {
	return (this.error ? true : (Date.now() - this.updated.getTime() > config.userPollInterval));
}

module.exports = mongoose.model('User', userSchema);