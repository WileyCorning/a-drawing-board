var express = require('express');
var app = express();
var cookieParser = require('cookie-parser');
app.set('view engine', 'jade');
app.use('/i',express.static('user_images'));
app.get('/i/*',function(req,res){
  res.status(404).redirect('/s/404.png')
})
app.use('/s',express.static('static'));
app.use(cookieParser());

var http = require('http').Server(app);
var io = require('socket.io')(http);

var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');

var SocketHandler = require('./socket-handler.js')
var router = require('./router');

/* INIT */
function startServer(){
  return MongoClient.connect("mongodb://localhost:27017/adb").then(function(db){
    app.use(router(db));

    io.on('connection',function(socket){
      console.log("new connection!");
      new SocketHandler(db,io,socket);
    });
    var port_number = 8080;
    http.listen(port_number, function(){
      console.log('Began listening on port '+port_number);
    });
  });
}

startServer();
