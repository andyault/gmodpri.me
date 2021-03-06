var express = require('express'),
	bodyParser = require('body-parser'),
	methodOverride = require('method-override'),
	cookieSession = require('cookie-session'),
	passport = require('passport'),
	steam = require('passport-steam'),
	mongoose = require('mongoose'),
	cookieParser = require('cookie-parser'),
	csrf = require('csurf');

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

var port = process.env.PORT || 8080;

mongoose.connect(config.mongo.url + '/' + config.mongo.db, config.mongo.options);

app.use(bodyParser.json());
app.use(bodyParser.json({ type: 'application/vnd.api+json' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(methodOverride('X-HTTP-Method-Override'));

app.use(cookieParser('plod.gator'));

app.use(cookieSession({
	secret: 'plod.gator',
	saveUninitialized: true,
	resave: true
}));

app.use(csrf());

app.use(function (err, req, res, next) {
	if (err.code !== 'EBADCSRFTOKEN') return next(err)

	req.method = 'GET';
	res.redirect('/return?msg=csrf&location=' + encodeURIComponent(req.url));
})

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(__dirname + '/public'));

//routes

require('./app/routes')(app);

//start app

app.listen(port);

console.log("Server started on port " + port);

exports = module.exports = app;