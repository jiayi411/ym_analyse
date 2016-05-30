var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var flash = require('connect-flash');

var passport = require('passport');
_ = require('underscore');

var auth = require('./modules/ym-auth.js');
var session = require('express-session');

var routes = require('./routes/index');
var users = require('./routes/users');
var base_data = require('./routes/base-data');
var keep_data = require('./routes/keep-data');
var hour_data = require('./routes/hour-data');
var machine_keep_data = require('./routes/machine-keep-data');
var login = require('./routes/login' );
var online = require('./routes/online' );
var level_data = require('./routes/level-data' );
var recharge_data = require('./routes/recharge-data');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// set self module
//app.set()

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('less-middleware')(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

// for passport
app.use(session({ secret: 'yomeenanalyse',cookie: { maxAge: 600000 } } ));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash());
//app.use(flash()); // use connect-flash for flash messages stored in session

app.use('/', routes);
app.use('/users', users);
app.use('/base-data', base_data);
app.use('/keep-data', keep_data);
app.use('/machine-keep-data', machine_keep_data);
app.use('/hour-data', hour_data);
app.use('/login', login );
app.use('/online', online);
app.use('/level-data', level_data);
app.use('/recharge-data', recharge_data);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

// 连接数据库
ymdb = require('./modules/ym-database.js');
//ymdb.initDB();
ymdb.initDBPool();
// 所有渠道
gChannels = [];
// 所有区
gServerIds = [];

gCombineFactor = function() {
    var length = arguments.length;

    var result = "";
    // 1 Channel
    if (length >= 1 && arguments[0] > 0) {
        result += " and channel=" + arguments[0];
    }
    // 2 ServerId
    if (length >= 2 && arguments[1] > 0) {
        result += " and server_id=" + arguments[1];
    }

//    result += " and server_id < 100";

    return result;
};

// 初始化passport
auth.config( passport, ymdb );


ym = require('./ym-function.js');

module.exports = app;

