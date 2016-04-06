

var app = require('express')();
var cookieParser = require('cookie-parser');
app.set('view engine', 'jade');
app.use(cookieParser());

var http = require('http').Server(app);
var io = require('socket.io')(http);
var mysql = require('mysql');
var fs = require('fs');
var $ = require('jquery');
var jwt = require('jsonwebtoken');

var database_query_manager = require('./database_query_manager');
var ajax_handlers = require('./ajax_handlers');
var router = require('./router');

// Maintain a single database connection through a local account
var dbc = mysql.createConnection({
  host: 'localhost',
  user: 'robot',
  database: 'garbage'
});

dbc.connect(function(err){if(err){console.log(err);}else{console.log('Connected to db');}});

var dbqm = new database_query_manager(dbc);
app.use(router(dbqm));

io.on('connection', function(socket) {
  var handlers = new ajax_handlers(io,socket,dbqm);
  Object.keys(handlers).forEach(function(event_type){
    socket.on(event_type,function(msg){console.log(event_type,msg);handlers[event_type](msg);});
  });
  console.log("Somebody connected");
});


http.listen(3000, function(){
  console.log('listening on *:3000');
});
