var express = require('express'),
	Busboy = require('busboy'),
	path = require('path'),
	url = require('url'),
	dns = require('dns'),
	fs = require('fs');

var User = require('../models/user'),
	Community = require('../models/community');

var config = require('../../config');

var addActivity = function(user, info, shouldSave) {
	info.time = Date.now();
	
	user.activity.unshift(info);
	
	user.activity = user.activity.slice(0, config.activityLength);
	
	if(shouldSave) {
		user.save();
	}	
}

var handleForm = function(req, cb) {
	var busboy = new Busboy({headers: req.headers});
	var data = {},
		files = {},
		servers = [],
		curServer;

	busboy
		.on('field', function(field, val) {
			if(val) {
				if(field == 'servernum')
					servers[val] = curServer = {};
				else if(field.search(/^server/) > -1)
					curServer[field.replace(/^server/, '')] = val;
				else if(val)
					data[field] = val;
			}
		})

		.on('file', function(field, file, filename, encoding, mimetype) {
			files[field] = {
				'filename': filename,
				'encoding': encoding,
				'mimetype': mimetype,
				'data': []
			}

			file
				.on('data', function(chunk) {
					files[field].data.push(chunk);
				})

				.on('end', function() {
					files[field].data = Buffer.concat(files[field].data);
				});
		})

		.on('finish', function() {
			cb(data, files, servers);
		});

	req.pipe(busboy);
}

var router = express.Router();

router.post('/community/new', function(req, res) {
	if(!req.user) {
		res.redirect('/return?msg=log_in&location=' + encodeURIComponent('/login'));
		return
	}
	
	handleForm(req, function(data, files, servers) {
		var checked = 0;

		servers.forEach(function(server) {
			server.ip = (server.ip.match(/^[^:]+:\/\//) ? '' : 'http://') + server.ip;

			server.ip = url.parse(server.ip).hostname;
			server.port = +(server.port || 27015);

			if(server.port < 0 || server.port > 65536) {
				res.redirect('/return?msg=error&location=' + encodeURIComponent('/community/new'));
				return
			}

			dns.lookup(server.ip, 4, function(err, ip) {
				if(err)
					throw err;

				if(ip !== server.ip) {
					server.domain = server.ip;
					server.ip = ip;
				}

				addAndCheck();
			});
		});

		var addAndCheck = function() {
			if(++checked == servers.length) {
				//make sure we're not adding the same ip twice
				
				var ips = {};

				servers.forEach(function(server) {
					if(!ips[server.ip + server.port])
						ips[server.ip + server.port] = true;
					else {
						res.redirect('/return?msg=error&location=' + encodeURIComponent('/community/new'));
						return
					}
				});

				delete ips;

				Community.find({}, function(err, communities) {
					if(err)
						throw err;
					
					//make sure no one else has any of our servers

					communities.forEach(function(community) {
						community.servers.forEach(function(server) {
							servers.forEach(function(myserver) {
								if(server.ip == myserver.ip && server.port == myserver.port) {
									res.redirect('/return?msg=already_exists&location=' + encodeURIComponent('/community/' + community._id));
									return
								}
							});
						});
					});

					var file = files.banner;

					if(!file || file.mimetype.search('image/.*') < 0) {
						res.redirect('/return?msg=no_file&location=' + encodeURIComponent('/community/new'));
						return
					}

					var newCommunity = new Community({
						name: data.name,
						description: data.desc,
						fileext: path.extname(file.filename),
						website: data.website,
						owner: req.user.id,
						servers: servers,
						added: new Date()
					});

					User.findOne({id: req.user.id}, function(err, user) {
						if(err)
							throw err;

						user.communities.unshift(newCommunity._id);

						addActivity(user, {
							type: 'server',
							action: 'add',
							name: data.name,
							id: newCommunity._id
						}, true);
					});

					newCommunity.save(function(err) {
						if(err)
							throw err;

						console.log(' ', 'Community', "'" + newCommunity.name + "'", 'saved:');
						
						newCommunity.servers.forEach(function(server) {
							console.log(' ', ' ', server.ip + ':' + server.port, server.domain ? '(' + server.domain + ':' + server.port + ')' : '');
						});
						
						var filepath = path.join(process.cwd(), '/public/assets/img/banners/', newCommunity._id + newCommunity.fileext);
						fs.writeFile(filepath, file.data);

						res.redirect('/return?msg=community_added&location=' + encodeURIComponent('/community/' + newCommunity._id));
					});
				});
			}
		}
	});
});

router.post('/community/:id/edit', function(req, res) {
	if(!req.user) {
		res.redirect('/return?msg=log_in&location=' + encodeURIComponent('/login'));
		return
	}
	
	Community.findOne({_id: req.params.id}, function(err, community) {
		if(err)
			throw err;
		
		if(!community) { //don't have to make this pretty because it'll only happen if people try to play dirty
			res.end();
			return
		}
			
		if(community.owner !== req.user.id) {
			res.redirect('/return?msg=not_owner&location=' + encodeURIComponent('/login'));
			return
		}
		
		handleForm(req, function(data, files, servers) {
			var checked = 0;

			servers.forEach(function(server) {
				server.ip = (server.ip.match(/^[^:]+:\/\//) ? '' : 'http://') + server.ip;

				server.ip = url.parse(server.ip).hostname;
				server.port = +(server.port || 27015);

				if(server.port < 0 || server.port > 65536) {
					res.redirect('/return?msg=error&location=' + encodeURIComponent('/community/new'));
					return
				}

				dns.lookup(server.ip, 4, function(err, ip) {
					if(err)
						throw err;

					if(ip !== server.ip) {
						server.domain = server.ip;
						server.ip = ip;
					}

					addAndCheck();
				});
			});

			var addAndCheck = function() {
				if(++checked == servers.length) {
					//make sure we're not adding the same ip twice

					var ips = {};

					servers.forEach(function(server) {
						if(!ips[server.ip + server.port])
							ips[server.ip + server.port] = true;
						else {
							res.redirect('/return?msg=error&location=' + encodeURIComponent('/community/new'));
							return
						}
					});

					delete ips;

					Community.find({_id: {$ne: req.params.id}}, function(err, communities) {
						if(err)
							throw err;

						//make sure no one else has any of our servers

						communities.forEach(function(community) {
							community.servers.forEach(function(server) {
								servers.forEach(function(myserver) {
									if(server.ip == myserver.ip && server.port == myserver.port) {
										res.redirect('/return?msg=already_exists&location=' + encodeURIComponent('/community/' + community._id));
										return
									}
								});
							});
						});
						
						var update = {
							name: data.name,
							description: data.desc,
							website: data.website || '',
							servers: servers,
							updated: 0
						}

						var file = files.banner;
						
						if(file.filename)
							update.fileext = path.extname(file.filename);
						
						community.update(update, function(err) {
							if(err)
								throw err;

							console.log(' ', 'Community', "'" + community.name + "'", 'edited:');

							servers.forEach(function(server) {
								console.log(' ', ' ', server.ip + ':' + server.port, server.domain ? '(' + server.domain + ':' + server.port + ')' : '');
							});
							
							console.log('')
							
							if(file.filename) {
								var filepath = path.join(process.cwd(), '/public/assets/img/banners/', community._id + community.fileext);
								fs.writeFile(filepath, file.data);
							}

							res.redirect('/return?msg=community_added&location=' + encodeURIComponent('/community/' + community._id));
						});
					});
				}
			}
		});
	});
});

module.exports = router;