/**
 * Created by jiayi on 14/11/22.
 */
var flash = require('connect-flash');
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on
    if (req.isAuthenticated())
        return next();

    req.flash('redirect', req.baseUrl );

    // if they aren't redirect them to the home page
    res.redirect('/login');
}


// passport
var localStrategy = require('passport-local').Strategy;
// Configuration
function config( passport, connection ){

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.user_id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        connection.query("select * from account where user_id = "+ id, function(err, rows){
            done(err, rows[0]);
        });
    });

    passport.use( new localStrategy(
        function( username, password, done ){
            // 查找用户名
            var query = "select * from account where username='%s'";
            query = ym.sprintf( query, username );
            connection.query( query, function( err, rows, fields ){
                if( err ){
                    return done(err);
                }

                // not find
                if( rows.length == 0 ) {
                    return done(null, false, { message: 'incorrect username' });
                }

                //看密码对不对
                if( rows[0].password != password ){
                    return done( null, false, { message: 'incorrect password' } );
                }

                // 通过
                return done( null, rows[0] );
            });
        }
    ))
}

module.exports.isLoggedIn = isLoggedIn;
module.exports.config = config;
