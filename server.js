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
		console.log('Database error: ', err);
	} else {
		console.log('Successful database connection.');

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

    
		app.get('/', function(req, res) {
			res.sendFile(process.cwd() + '/views/index.html');
		});


		app.post("/api/shorturl/new", function(req, res) { //User hit 'POST URL' button.
			let user_url = req.body.url; //Gets the URL from the body of the page.

			if (!user_url) { //Checks if user_url is blank.
				console.log("shorturl/new - catch: blank input.");
				res.json({
					"error": "invalid URL"
				});
			}

			user_url = user_url.replace(REPLACE_REGEX, ''); //Strips off the http(s):// from the URL

			dns.lookup(user_url, function onLookup(err, address, family) { //Checks if user_url is a valid URL.
				if (err) { //There was not a valid dns.
					console.log("dns.lookup - error: ", err);
					res.json({
						"error": "invalid URL"
					});
				} else { //There was a valid dns.
					console.log("dns.lookup - no error.");

					findByURL(user_url, function(err, data) { //Checks if user_url is already in database.
						if (err) {
							console.log("findByURL - No user_url found: ", err);
						} else {
							console.log("findByURL - user_url was found: ", data);
						}

						if (!data) { //The record doesn't exist, so we need to add it.
							countURLs(function(err, data) { //Counts number of records in database.
								if (err) { //Was not able to count records.
									console.log("countURLs - Error: ", err);
									res.json({
										"error": "Database error: .count"
									});
								} else { //Was able to count number of records.
									let currCount = data;
									console.log("countURLs - no error: ", currCount);

									findAndUpdateURL(user_url, currCount, function(err, data) {
										if (err) { //Record not saved to database.
											console.log("findAndUpdateURL - Error: ", err);
											res.json({
												"error": err
											});
										} else { //New record saved to database.
											console.log("findAndUpdateURL - No Error");
											res.json({
												"original_url": user_url,
												"short_url": currCount + 1
											});
										}
									});
								}
							});
						} else { //The record exists and we can skip to the end.
							res.json({
								"original_url": user_url,
								"short_url": data.short_url
							});
						}
					});
				}
			})
		});


		app.get("/api/shorturl/:input", function(req, res) { //User clicks a link or enters URL. (Uses Get, not Post.)
			let user_input = req.params.input;

			if (isNaN(user_input)) { //user_input includes non-numeric characters and is invalid.
				console.log("/api/shorurl/:input - catch: non-numeric characters.");
				res.json({
					error: "Wrong Format"
				});
			}

			findByID(user_input, function(err, data) { //Searches database for the user_input.
				if (err) { //Error with database.
					console.log("findById - Error: ", err);
					res.json({
						"error": "Database error: .findOne"
					});
				} else if (data) { //Successfully found URL in database.
					console.log("findById - No Error", data.orig_url);
					res.redirect('https://' + data.orig_url);
				} else { //Was not able to find URL in database.
					console.log("findById - catch: No matching URL in database");
					res.json({
						error: "No short url found for given input"
					});
				}
			});
		});


		var countURLs = function(done) {
			URL.count((err, data) => {
				if (err) {
					done(err);
				}
				done(null, data);
			})
		};
    

		var findAndUpdateURL = function(user_url, currCount, done) { //Finds the URL and updates it.
			URL.findOneAndUpdate({
					orig_url: user_url
				}, {
					short_url: currCount + 1
				}, {
					upsert: true,
					new: true
				},
				(err, data) => {
					if (err) {
						done(err);
					}
					done(null, data);
				})
		};


		var findByURL = function(user_url, done) { //Checks the database if the URL is there already.
			URL.findOne({
				orig_url: user_url
			}, (err, data) => {
				if (err) {
					done(err);
				}
				done(null, data);
			})
		}


		var findByID = function(url_id, done) { //Searches database for the url_ID. Returns so can redirect.
			URL.findOne({
				short_url: url_id
			}, (err, data) => {
				if (err) {
					done(err);
				}
				done(null, data);
			})
		}


		app.listen(port, function() {
			console.log('Node.js listening ...');
		});
	}
});