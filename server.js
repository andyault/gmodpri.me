var express = require('express'),
	bodyParser = require('body-parser'),
	methodOverride = require('method-override'),
	session = require('express-session'),
	passport = require('passport'),
	steam = require('passport-steam'),
	mongoose = require('mongoose');

var app = express();

var config = require('./config');

//passport

passport.serializeUser(function(user, done) {
	done(null, user);
});

passport.deserializeUser(function(obj, done) {
	done(null, obj);
});

passport.use(new steam.Strategy({
		realm: config.passport.realm,
		returnURL: config.passport.returnURL,
		apiKey: config.apiKey
	},
	function(id, profile, done) {
		process.nextTick(function() {
			profile.identifier = id;
			return done(null, profile);
		})
	}
));

//config

var port = process.env.PORT || 80;

mongoose.connect(config.mongo.url + '/' + config.mongo.db, config.mongo.options);

app.use(bodyParser.json());
app.use(bodyParser.json({ type: 'application/vnd.api+json' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(methodOverride('X-HTTP-Method-Override'));

app.use(session({
	secret: 'plod.gator',
	resave: true,
	saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(__dirname + '/public'));

//routes

require('./app/routes')(app);

//start app

app.listen(port);

console.log("Server started on port " + port);

exports = module.exports = app;