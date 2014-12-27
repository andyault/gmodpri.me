var chalk = require('chalk');

var User = require('./models/user');

var lastIP,
	methods = {
		GET: true,
		HEAD: true,
		OPTIONS: true
	},
	fields = ['params', 'body'];

var timestamp = function() {
	var now = new Date();
	
	return chalk.blue(now.getMonth() + '/' + now.getDate() + ' ' + now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds());
}

module.exports = function(app) {
	process.on('uncaughtException', function(err) {
		console.log(chalk.red.bold('Error!'), '\n');
		
		if(err.stack)
			console.log(' ', chalk.red(err.stack));
		else
			console.log(' ', chalk.red(err.toString()));
		
		console.log('');
	});
	
	app.use(function(req, res, next) {
		if(!methods[req.method]) {
			if(lastIP !== req.ip) {
				lastIP = req.ip;

				console.log('\n' + chalk.bold(lastIP + ':'));
			}
			
			console.log(' ', '@', timestamp(), ':');
			console.log(' ', ' ', req.method, req.url);
			
			fields.forEach(function(field) {
				var empty = true;
				
				for(var key in req[field]) {
					if(req[field].hasOwnProperty(key)) {
						empty = false;
						break
					}
				}
				
				if(!empty) {
					console.log(' ', ' ', ' ', field + ':', req[field]);
				}
			});
			
			console.log('');
		}
		
		if(req.user) {
			User.findOne({id: req.user.id}, function(err, userdata) {
				if(err)
					throw err;
				
				if(userdata) {
					userdata.lastSeen = Date.now();
					userdata.save();
				}
			});
		}

		next();
	});
	
	app.use('/', require('./routes/auth'));
	app.use('/', require('./routes/api'));
	app.use('/', require('./routes/users'));
	app.use('/', require('./routes/communities'));
	app.use('/', require('./routes/forms'));

	app.get('*', function(req, res) {
		res.cookie('XSRF-TOKEN', req.csrfToken());
		
		res.sendFile('/views/index.html', {root: __dirname});
	});
}