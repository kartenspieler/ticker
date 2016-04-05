var LocalStrategy 	 = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var User 			 = require('../models/user');
var auth 			 = require('./auth');

module.exports = function(passport) {
	
	passport.serializeUser(function(user, done) {
		done(null, user.id);
	});	

	passport.deserializeUser(function(id, done) {
		User.findById(id, function (err, user) {
			done(err, user);
		});
	});

	passport.use('local-signup', new LocalStrategy({
		usernameField : 'email',
		passwordField : 'password',
		passReqToCallback : true // allows us to pass back the entire request to the callback
	}, function (req, email, password, done) {
		process.nextTick(function() {
			User.findOne({ 'local.email' :  email }, function(err, user) {
				if (err) 
					return done(err);

				if (user) {
					return done(null, false, req.flash('signupMessage', 'User already in database'));
				} else {
					var newUser = new User();
					newUser.local.email = email;
					newUser.local.password = newUser.generateHash(password);

					newUser.save(function (err) {
						if (err)
							throw err;

						return done(null, newUser)
					});
				}	
			});
		});
	}));

	passport.use('local-login', new LocalStrategy({
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    }, function(req, email, password, done) { // callback with email and password from our form

        // find a user whose email is the same as the forms email
        // we are checking to see if the user trying to login already exists
        User.findOne({ 'local.email' :  email }, function(err, user) {
            // if there are any errors, return the error before anything else
            if (err)
                return done(err);

            // if no user is found, return the message
            if (!user)
                return done(null, false, req.flash('loginMessage', 'No user found.')); // req.flash is the way to set flashdata using connect-flash

            // if the user is found but the password is wrong
            if (!user.validPassword(password))
                return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.')); // create the loginMessage and save it to session as flashdata

            // all is well, return successful user
            return done(null, user);
        });

    }));

	passport.use(new FacebookStrategy({
        clientID        : auth.facebookAuth.clientID,
        clientSecret    : auth.facebookAuth.clientSecret,
        callbackURL     : auth.facebookAuth.callbackURL,
        profileFields: ['id', 'emails', 'name']

    }, function(token, refreshToken, profile, done) {

        process.nextTick(function() {

            User.findOne({ 'facebook.id' : profile.id }, function(err, user) {

                // if there is an error, stop everything and return that
                // ie an error connecting to the db
                if (err)
                    return done(err);

                // if the user is found, then log them in
                if (user) {
                    return done(null, user); // user found, return that user
                } else {
                    var newUser            = new User();
                    newUser.facebook.id    = profile.id;
                    newUser.facebook.token = token;
                    newUser.facebook.name  = profile.name.givenName + ' ' + profile.name.familyName;
                    newUser.facebook.email = profile.emails[0].value;

                    newUser.save(function(err) {
                        if (err)
                            throw err;

                        return done(null, newUser);
                    });
                }

            });
        });

    }));
}