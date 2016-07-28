
var auth = require('./auth');
var util = require('./util');
var assert = require('assert');

module.exports = function(db,io,socket){
  var self = this;

  self.state={};

  self.verifyUserID = function(user_id_provided){
    console.log(self.state)
    console.log(user_id_provided)
    // Important to use ===; we want to make sure it's a string
    assert('user_id' in self.state && (self.state.user_id===user_id_provided),'Could not verify user ID');
  }

  self.hooks = {
    login: function(msg){
      util.requireProperties(msg,['username','password']);
      return auth.authenticate(db,msg.username,msg.password)
        .then(function(token){
          return {token: token};
        });
    },
    authenticateFromToken: function(msg){
      util.requireProperties(msg,['token']);
      return auth.authenticateFromToken(msg.token).then(function(data){
        self.state.user_id = data.user_id;
        self.state.username= data.username;
        return data;
      });
    },
    subscribeToNewAttachments: function(msg){
      util.requireProperties(msg,['up']);
      util.subscribeToNewAttachments(socket,msg.up);

      if('page' in msg.up){
        if(msg.up.page==='/'){
          return util.getFront(db);
        }
      }
      else if('post_id' in msg.up){
        return util.getPostsDownstream(db,msg.up.post_id);
      }
    },
    subscribeToNewFavorites: function(msg){
      util.requireProperties(msg,['user_id']);
      util.subscribeToNewFavorites(socket,msg.user_id);

      return util.getUserFavorites(db,msg.user_id);
    },
    subscribeToNewActions: function(msg){
      util.requireProperties(msg,['user_id']);
      util.subscribeToNewActions(socket,msg.user_id);

      return util.getUserActions(db,msg.user_id);
    },/*
    subscribeToUserDetails: function(msg){
      // TODO hook up listener
      return util.getUserDetails(db,msg.user_id);
    },
    subscribeToUserFavorites: function(msg){
      // TODO hook up listener
      return util.getUserFavorites(db,msg.user_id);
    },
    subscribeToPostDetails: function(msg){
      // TODO hook up listener
      return util.getPostDetails(db,msg.post_id);
    },*/
    createUser: function(msg){
      util.requireProperties(msg,['username','password']);
      return util.createUser(db,msg.username,msg.password);
    },
    createPost: function(msg){
      util.requireProperties(msg,['user_id','content','parent']);
      self.verifyUserID(msg.user_id);
      // TODO add requirePermission step
      return util.createPost(db,io,msg.user_id,msg.content,msg.parent);
    },
    createAttachment: function(msg){
      util.requireProperties(msg,['user_id','up','down']);
      self.verifyUserID(msg.user_id);
      // TODO add requirePermission step
      return util.createAttachment(db,io,msg.user_id,1,msg.up,msg.down);
    },
    createFavorite: function(msg){
      util.requireProperties(msg,['user_id','post_id']);
      self.verifyUserID(msg.user_id);
      return util.createFavorite(db,io,msg.user_id,msg.post_id);
    },
    removeFavorite: function(msg){
      util.requireProperties(msg,['user_id','post_id']);
      self.verifyUserID(msg.user_id);
      return util.removeFavorite(db,io,msg.user_id,msg.post_id);
    }
  }

  var linkup = function(key){
    socket.on(key,function(msg){
      console.log(key+': '+JSON.stringify(msg));
      new Promise(function(resolve,reject){
        resolve(self.hooks[key](msg));
      })
      .then(
        function(data){
          console.log(key+':success'+'\t'+data)
          socket.emit(key+':success',data);
        },
        function(err){
          // TODO separate handling for internal and external errors
          console.log(key+':failure'+'\t'+err)
          socket.emit(key+':failure',err);
        }
      );
    });
  }

  for(key in self.hooks){
    linkup(key);
  }

}

/*
  Module to handle messages sent through the socket.io connection.
  Maintains state information on the user's login status and privileges.
*/
/*
var jwt = require('jsonwebtoken');

var util = require('./util');
var auth = require('./auth');

var JWT_KEY = 'unsecure key';

module.exports = function(io,socket,dbqm) {

  var private_state = {user_access:['guest']};
  var self = this;

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
      auth_check('user');
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
            if(msg['parent_id']){
              //TODO better selector
              io.emit('num_replies['+msg['parent_id']+']:delta',{'num_replies':1});
            }
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

  this.set_vote = function(msg) {
    try {
      auth_check('user');
      dbqm.set_vote(
        [private_state['user_id'],msg['post_id'],msg['vote_value']],
        function(rows){
          socket.emit('set_vote:success',{});
          //TODO better selector
          io.emit('vote_score['+msg['post_id']+']:update',{'vote_score':rows[0]['vote_score']});
        },
        function(err){
          socket.emit('set_vote:failure',{'feedback':err});
        }
      );
    }
    catch(err) {
      console.log(err);
    }
  }

  this.get_posts_matching = function(msg) {
    try {
      if(msg.parent_id){
        dbqm.get_replies_to([msg.parent_id==-1?undefined:msg.parent_id,private_state['user_id']],function(rows) {socket.emit('get_posts_matching:success',rows);},function(err){console.log(err)});
      }
      else if(msg.hasOwnProperty('author_id')){
        dbqm.get_posts_by([msg.author_id,private_state['user_id']],function(rows) {socket.emit('get_posts_matching:success',rows);},function(err){console.log(err)});
      }
      else {
        throw("Can't handle selector "+JSON.stringify(msg));
      }
    }
    catch(err) {
      console.log(err);
    }
  }

  this.disconnect = function(){};
};
*/
