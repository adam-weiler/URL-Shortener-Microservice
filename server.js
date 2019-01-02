'use strict';

const express = require('express');
const mongo = require('mongodb');
const mongoose = require('mongoose');

const cors = require('cors');

const app = express();
const bodyParser = require('body-parser');

const dns = require('dns');

// Basic Configuration
const port = process.env.PORT || 3000;

// This project needs a database.
mongoose.connect(process.env.MONGO_URI, (err, db) => {
	if (err) {
		console.log('Database error: ' + err);
	} else {
		console.log('Successful database connection');

		//app.use(cors());

		//This project needs to parse POST bodies.
		//Mount the body-parser here.
		app.use(bodyParser.json());
		app.use(bodyParser.urlencoded({
			extended: false
		}));

		app.use('/public', express.static(process.cwd() + '/public'));

		//Creates a URL model or Schema.
		const urlSchema = new mongoose.Schema({
			orig_url: {
				type: String,
				required: true,
				unique: true
			},
			short_url: {
				type: Number,
				unique: true
			}
		});

		var URL = mongoose.model('URL', urlSchema);

		const REPLACE_REGEX = /^https?:\/\//i //A Regex to strip the http(s):// from any URLs.

		//const url1 = 'https://google.ca';
		//const url2 = 'google.ca';
		//const url3 = 'http://google.ca';

		//Strip off HTTP
		//const res1 = url1.replace(REPLACE_REGEX, '');
		//const res2 = url2.replace(REPLACE_REGEX, '');
		//const res3 = url3.replace(REPLACE_REGEX, '');
		//console.log (res1 + ' ' + res2 + ' ' + res3);

    
		app.get('/', function(req, res) {
			res.sendFile(process.cwd() + '/views/index.html');
		});

    
		// your first API endpoint... 
		app.get("/api/hello", function(req, res) {
			res.json({
				greeting: 'hello API'
			});
		});


		app.post("/api/shorturl/new", function(req, res) {
			let user_url = req.body.url; //Gets the URL from the body of the page.

			if (!user_url) { //Checks if user_url is blank.
				res.json({
					"error": "invalid URL"
				});
			}

			user_url = user_url.replace(REPLACE_REGEX, ''); //Strips off the http(s):// from the URL

			dns.lookup(user_url, function onLookup(err, address, family) { //Checks if it's a valid URL.
				if (err) {
					console.log("dns.lookup - ", err);
					res.json({
						"error": "invalid URL"
					});
				} else {
					console.log("dns.lookup - no error");

					//Check database if URL exists.
					//ifSo, return id.

					// findOneURL(user_url, function(err, data) { //Creates and saves new user to database.
					// 	if (err) {
					// 		res.json("Some error!");
					// 	}
					// 	res.json({
					// 		"err": "no error!"
					// 	});
					// });

					// findEditThenSave(user_url, function(err, data) { //Finds URL, edits, then saves.
					// 	if (err) {
					// 		console.log("findEditThenSave - Error");
					// 	}
					// 	console.log("findEditThenSave - Down here");
					// });

					//ifnot, add url to database
					//return with id.

					createAndSaveURL(user_url, function(err, data) { //Creates and saves new user to database.
						if (err) {
							console.log("createAndSaveURL - Error");
							res.json({
								"error": "Database error!"
							});
						} else {
							console.log("createAndSaveURL - No Error");
							// res.json({
							// 	"original_url": user_url,
							// 	"short_url": "8"
							// });
						}
					});

					// 					var URLCount;

					// 					countURLs(function(err, data) { //Counts how many URLs are in the database.
					// 						if (err) {
					// 							res.json(err);
					// 						}
					// 						URLCount = data;
					// 					});

					//var value = db.urls.count();

					//res.json({"original_url":user_url,"short_url":value}); 
					res.json({
						"original_url": user_url,
						"short_url": "7"
					});
				}
			});
		});


		app.get("/api/shorturl/:input", function(req, res) { //User wants to load a website.
			let user_input = req.params.input;

			if (isNaN(user_input)) { //user_input includes non-numeric characters.
				res.json({
					error: "Wrong Format"
				});
			}

			findByID(user_input, function(err, data) { //Searches database for the user.
				if (err) {
					console.log("findOneURL - Error");
				}

				if (data) {
					console.log("findOneURL - No Error", data.orig_url);
					res.redirect('https://' + data.orig_url);
				} else {
					res.json({
						error: "No short url found for given input"
					});
				}

			});
		});

		//     var findOneByFood = function(food, done) {
		//   Person.findOne({favoriteFoods:food}, (err, data) => {
		//       if(err) {
		//          done(err); 
		//       }
		//     done(null, data);
		//     }) 
		// };

    
		var findOneURL = function(user_url, done) { //Checks database for the URL
			URL.findOne({
				orig_url: user_url
			}, (err, data) => {
				if (err) {
					done(err);
				}
				done(null, data);
			})
		}


		var findByID = function(url_id, done) { //Checks database for the ID
			URL.findOne({
				short_url: url_id
			}, (err, data) => {
				if (err) {
					done(err);
				}
				done(null, data);
			})
		}


		var findEditThenSave = function(user_url, done) {
			URL.findById(user_url, (err, data) => {
				if (err) {
					done(err);
				}

				data.save((err, data) => {
					if (err) {
						done(err);
					}
					done(null, data);
				});
			})
		};


		//     var findEditThenSave = function(personId, done) {
		//   var foodToAdd = 'hamburger';

		//   Person.findById(personId, (err, data) => {
		//     if(err) {
		//        done(err); 
		//     }

		//     data.favoriteFoods.push(foodToAdd);

		//     data.save((err, data) => {
		//       if(err) {
		//          done(err); 
		//       }
		//       done(null, data);    
		//     });
		//   })
		// };


		var createAndSaveURL = function(user_url, done) {
			var newURL = new URL({
				orig_url: user_url,
				short_url: 1
			});

			newURL.save(function(err, data) {
				if (err) return done(err)
				return done(null, data);
			});
		}


		var countURLs = function(done) {
			URL.count((err, data) => {
				if (err) {
					done(err);
				}
				done(null, data);
			})
		};


		/*
		var findRecordByURL = function(recordURL, done) {
		  URL.find({orig_url:recordURL}, (err, data) => {
		      if(err) {
		        console.log ("Error");
		         done(err); 
		      }
		    console.log ("Done!");
		    done(null, data);
		    }) 
		};


		var findRecord = findRecordByURL('puppies');


		mongoose.connect(process.env.MONGO_URI, function(err, db) {
		  if (err) throw err;
		  var dbo = db.db("mydb");
		  dbo.collection("customers").findOne({}, function(err, result) {
		    if (err) throw err;
		    console.log(result.name);
		    db.close();
		  });
		});

		*/

    
		app.listen(port, function() {
			console.log('Node.js listening ...');
		});

	}
});