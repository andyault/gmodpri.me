var express = require('express'),
	passport = require('passport');

var User = require('../models/user');

var router = express.Router();

router.get('/login', 
	passport.authenticate('steam', {failureRedirect: '/login'})
);

router.get('/login/return',
	passport.authenticate('steam', {failureRedirect: '/login'}),
	function(req, res) {
		/* still dunno if I should use this or not, don't let users join unless they own gmod

		http.get('http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?' +
				'key=' + config.apiKey + '&' +
				'steamid=' + req.user.id + '&' + 
				'input_json={' + 
					'appids_filter: [4000]' +
				'}&' +
				'format=json',
			function(gres) {
				var body = '';

				gres
				.on('data', function(chunk) {
					body += chunk;
				})

				.on('end', function() {
					var json = JSON.parse(body);

					res.json(json);
				});
		});

		*/

		User.findOne({id: req.user.id}, function(err, userdata) {
			if(err)
				throw err;

			if(!userdata) {
				userdata = new User({
					id: req.user.id,
					firstSeen: Date.now()
				}).save();
			}
		});

		res.redirect('/return?msg=logged_in');
	}
);

router.get('/logout', function(req, res){
	req.logout();

	res.redirect('/return?msg=logged_out');
});

module.exports = router;