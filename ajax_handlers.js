/*
  Module to handle messages sent through the socket.io connection.
  Maintains state information on the user's login status and privileges.
*/

var jwt = require('jsonwebtoken');
var fs = require('fs');

var JWT_KEY = 'unsecure key';

module.exports = function(io,socket,dbqm) {

  var private_state = {user_access:['guest']};
  var self = this;

  var update_user_access = function() {
    if(private_state['user_id']) {
      try {
        dbqm.get_user_access(
          [private_state['user_id']],
          function(rows){
            var flattened = rows.reduce(function(a,b){return a.concat(b['level']);});
            private_state['user_access'] = flattened;
          },
          function(err){
            console.log(err);
          }
        );
      }
      catch(err) {
        console.log(err);
      }
    }
  };

  this.login = function(msg) {
    try {
      dbqm.login(
        [msg['username'],msg['password']],
        function(rows){
          if(rows[0]) {
            var user_id = rows[0]['user_id'];
            var username = rows[0]['username'];
            var token = jwt.sign({'user_id': user_id,'username': username}, JWT_KEY, {expiresIn: "12h"});
            socket.emit('login:success',{'token':token});
          }
        },
        function(err){
          socket.emit('login:failure',{'feedback':err})
        }
      );
    }
    catch(err) {
      console.log(err);
    }
  }

  this.authenticate = function(msg) {
    try {
      var token = msg['token'];
      jwt.verify(token, JWT_KEY, function(err, decoded) {
        if(err) throw err;
        private_state['user_id'] = decoded['user_id'];
        private_state['username'] = decoded['username'];
        update_user_access();
        socket.emit('authenticate:success',{});
      });
    }
    catch(err) {
      socket.emit('authenticate:failure',{});
      console.log(err);
    }
  }

  this.create_user = function(msg) {
    try {
      var res_create_user = dbqm.create_user(
        [msg['username'],msg['password']],
        function(rows) {
          socket.emit('create_user:success',{'user_id': rows[0]['user_id']});
          // Dodgy
          self.login(msg);
        },
        function(err) {
          socket.emit('create_user:failure',{'feedback':err});
        }
      );
    }
    catch(err) {
      console.log(err);
    }
  }

  this.create_post = function(msg){
    try {
      dbqm.create_post(
        [private_state['user_id'],msg['parent_id']],
        function(rows){
          var content_addr = rows[0]['content'];

          var imdata = msg['content'].replace(/^data:image\/png;base64,/, "");
          var buf = new Buffer(imdata,'base64');

          fs.writeFile('user_images/'+content_addr+'.png',buf,function(err){
            if(err)console.log(err);
            socket.emit('create_post:success',{});
            io.sockets.in(socket.room).emit('message',rows[0]);
          });
        },
        function(err){
          socket.emit('create_post:failure',{'feedback':err});
        }
      );
    }
    catch(err) {
      console.log(err);
    }
  };

  this.get_posts_matching = function(msg) {
    try {
      dbqm.get_posts_matching([msg.parent_id,msg.author_id],function(rows) {socket.emit('messages',rows);},function(err){console.log(err)});
    }
    catch(err) {
      console.log(err);
    }
  }

  this.disconnect = function(){};
};
