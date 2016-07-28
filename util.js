
var bcrypt = require('bcrypt');
var fs = require('fs');
var assert = require('assert');

// TODO break up into smaller modules, save db and io as state

/* Multi-step calls */
function createPost(db,io,user_id,content,parent){
  var timestamp = Date.now();

  // Nesting is an ugly pattern - flatten?
  return incrementGlobal(db,'post_id').then(function(post_id){
    console.log('Creating post '+post_id)
    return writeImageFile(post_id,content)
      .then(function(){
        return insertPost(db,post_id,user_id,timestamp);
      })
      .then(function(doc_post){
        console.log('Creating attachment record for post '+post_id)
        if('post_id' in parent){
          return createAttachment(db,io,user_id,0,{post_id:parent.post_id},{post_id:post_id})
        }
        else if('page' in parent){
          return createAttachment(db,io,user_id,0,{page:parent.page},{post_id:post_id});
        }
        else{
          // Attach to front by default
          return createAttachment(db,io,user_id,0,{page:'/'},{post_id:post_id});
        }
      })
      .then(function(doc_attach){
        return({post_id:doc_attach.post_id,attach_id:doc_attach.attach_id});
      });
  });
}

function createAttachment(db,io,user_id,type,up,down){
  var timestamp = Date.now();

  return incrementGlobal(db,'attach_id').then(function(attach_id){
    return insertAttachment(db,attach_id,user_id,type,up,down,timestamp).then(function(doc){
      notifyNewAttachment(io,doc);
      return(doc);
    })
  });
}

function createUser(db,username,password){
  var timestamp = Date.now();
  return userExists(db,username).then(function(doesExist){
    assert(!doesExist, 'A user with the name \"' + username + '\" already exists'); // Check for username conflict
    return incrementGlobal(db,'user_id').then(function(user_id){
      return hashPassword(password).then(function(password_hash){
        var permissions = ['user'];
        var favorites = [];
        return insertUser(db,user_id,username,password_hash,permissions,favorites,timestamp)
          .then(function(doc){
            return {user_id: doc.user_id};
          });
      });
    });
  });
}

function createFavorite(db,io,user_id,post_id){
  var timestamp = Date.now();
  return insertFavorite(db,user_id,post_id,timestamp).then(function(doc){
    notifyFavoriteCreated(io,user_id,doc);
  });
}

function removeFavorite(db,io,user_id,post_id){
  return db.collection('user').updateOne(
    {user_id:user_id},
    {$pull: {'favorites':{post_id: post_id}}}
  )
  .then(function(){
    notifyFavoriteRemoved(io,user_id,{post_id: post_id});
  })
};

/* Notifiers */
function subscribeToNewAttachments(socket,up){
  socket.join('newAttachment['+JSON.stringify(up)+']');
}
function subscribeToNewFavorites(socket,user_id){
  socket.join('newFavorite['+user_id+']');
}
function subscribeToNewActions(socket,user_id){
  socket.join('newAction['+user_id+']');
}
// TODO rename stuff
function notifyNewAttachment(io,data){
  var target = JSON.stringify(data.up);
  var author = data.user_id;
  io.sockets.in('newAttachment['+target+']').emit(target+':newAttachment',data);
  io.sockets.in('newAttachment['+author+']').emit(author+':newAttachment',data);
}
function notifyFavoriteCreated(io,user_id,data){
  console.log('newFavorite['+user_id+']',user_id+":newFavorite");
  io.sockets.in('newFavorite['+user_id+']').emit(user_id+":favoriteAdded",data);
}
function notifyFavoriteRemoved(io,user_id,data){
  console.log('newFavorite['+user_id+']',user_id+":newFavorite");
  io.sockets.in('newFavorite['+user_id+']').emit(user_id+":favoriteRemoved",data);
}


/* Aliasing */
ALIAS_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_';
function intToAlias(x){
  var s = '';
  while(x){
    s = ALIAS_CHARS[x%64] + s;
    x = Math.floor(x/64);
  }
  return s;
}
function aliasToInt(s){
  var x = 0;
  for(var i = 0; i < s.length; i++){
    x += ALIAS_CHARS.indexOf(s[i])*Math.pow(64,s.length-i-1);
  }
  return x;
}

/* Single-step calls */
function incrementGlobal(db,key,return_alias){
  // Return alias (string representation of int) as default
  return_alias = return_alias == null ? true : return_alias;
  return db.collection('global').findOneAndUpdate(
      {key:key},
      {$inc:{value:1}},
      {upsert:true,returnOriginal:false}
    )
    .then(function(doc){
        return(return_alias ? intToAlias(doc.value.value) : doc.value.value);
    });
}


function insertPost(db,post_id,user_id,timestamp){
  var doc = {
    post_id: post_id,
    user_id: user_id,
    timestamp: timestamp
  };
  return db.collection('post').insertOne(doc).then(function(){return doc;});
}

function insertAttachment(db,attach_id,user_id,type,up,down,timestamp){
  var doc = {
    attach_id: attach_id,
    user_id: user_id,
    type: type,
    up:up,
    down:down,
    votes:0,
    timestamp:timestamp
  };
  return db.collection('attach').insertOne(doc).then(function(){return doc;});
}

function insertUser(db,user_id,username,password_hash,permissions,favorites,timestamp){
  var doc = {
    user_id: user_id,
    username: username,
    password: password_hash,
    permissions: permissions,
    favorites: favorites,
    timestamp: timestamp
  };
  return db.collection('user').insertOne(doc).then(function(){return doc;});
}

function insertFavorite(db,user_id,post_id,timestamp){
  var doc = {
    post_id: post_id,
    timestamp: timestamp
  };
  return db.collection('user').updateOne(
    {user_id:user_id},
    {$push: {favorites: doc}}
  )
  .then(function(){return doc;});
}


/* File I/O */
function writeImageFile(post_id,content){
  console.log('Writing image file for post '+post_id);
  return new Promise(function(resolve,reject){
    // Strip image headers
    var imdata = content.replace(/^data:image\/png;base64,/, "");
    var buf = new Buffer(imdata,'base64');

    fs.writeFile('user_images/'+post_id+'.png',buf,function(err){
      if(err){
        console.log('Image failed to write for post '+post_id);
        reject(err);
      }
      console.log('Image wrote successfully for post '+post_id);
      resolve();
    });
  });
}

/* Crypto */
function hashPassword(password_plaintext){
  return new Promise(function(resolve,reject){
    bcrypt.hash(password_plaintext,10,function(err,hash){
      if(err){
        reject(err);
      }
      resolve(hash);
    });
  });
}
function checkPassword(db,user_id,password_plaintext){
  return db.collection('user')
    .findOne({user_id:user_id})
    .then(function(doc){
      return new Promise(function(resolve,reject){
        bcrypt.compare(password_plaintext,doc.password,function(err,res){
          if(err){
            reject(err);
          }
          resolve(res);
        });
      });
    });
}

/* Queries */
function getFront(db){
  return db.collection('attach')
    .find({'up.page': '/'})
    .project({_id: 0, attach_id: 1, type: 1, down: 'obj', timestamp: 1, votes: 1})
    .toArray();
}
function getPostsDownstream(db,post_id){
  return db.collection('attach')
    .find({'up.post_id': post_id})
    .project({_id: 0, attach_id: 1, type: 1, down: 1, timestamp: 1, votes: 1})
    .toArray();
}
function getPostsUpstream(db,post_id){
  return db.collection('attach')
    .find({'down.post_id': post_id})
    .project({_id: 0, attach_id: 1, type: 1, up: 1, timestamp: 1, votes: 1})
    .toArray();
}
function getUserActions(db,user_id){
  return db.collection('attach')
    .find({user_id: user_id})
    .project({_id: 0, attach_id: 1, type: 1, up: 1, down: 1, timestamp: 1, votes: 1})
    .toArray();
}
function getPostDetails(db,post_id){
  return db.collection('post')
    .findOne({post_id:post_id})
    .then(function(doc_post){
      var fetch_author = db.collection('user').findOne({user_id:doc_post.user_id});
      var fetch_parent = db.collection('attach').findOne({'down.post_id':doc_post.post_id, type:0});
      return Promise.all([fetch_author,fetch_parent]).then(function(arr){
        return ({
          post_id: doc_post.post_id,
          user_id: doc_post.user_id, //redundant
          timestamp: doc_post.timestamp,
          author: arr[0],
          parent: arr[1].up
        });
      });
    });
}
function getUserDetails(db,user_id){
  return db.collection('user')
    .findOne({user_id:user_id})
    .then(function(doc){
      return {user_id: doc.user_id, username: doc.username, timestamp: doc.timestamp};
    });
}
function getUserFavorites(db,user_id){
  return db.collection('user')
    .findOne({user_id: user_id})
    .then(function(doc){
      return doc.favorites;
    });
}
function getUserPermissions(db,user_id){
  return db.collection('user')
    .findOne({user_id:user_id})
    .then(function(doc){
      return doc.permissions;
    });
}
function getUserFavorites(db,user_id){
  return db.collection('user')
    .findOne({user_id:user_id})
    .then(function(doc){
      return doc.favorites;
    });
}
function findUserID(db,username){
  return db.collection('user')
    .findOne({username:username})
    .then(function(doc){
      return doc.user_id;
    });
}
function userExists(db,username){
  return db.collection('user')
    .findOne({username:username})
    .then(function(doc){
      return(!!doc);
    });
}

/* Other utilities */
function findMissingProperty(obj,prop_names){
  for(var i = 0; i < prop_names.length; i++){
    if(!(prop_names[i] in obj)){
      return prop_names[i];
    }
  }
  return false;
}
function requireProperties(obj,prop_names){
  var missing = findMissingProperty(obj,prop_names);
  assert(!missing, 'Message lacked required property \"'+missing+'\"');
}

// Make the exports a little cleaner
var functions_to_export = [
  createPost,
  createAttachment,
  createUser,
  createFavorite,
  removeFavorite,
  subscribeToNewAttachments,
  subscribeToNewFavorites,
  subscribeToNewActions,
  checkPassword,
  getFront,
  getPostsDownstream,
  getPostsUpstream,
  getUserActions,
  getPostDetails,
  getUserDetails,
  getUserPermissions,
  getUserFavorites,
  findUserID,
  userExists,
  requireProperties
]
module.exports={};
for(var i =0; i < functions_to_export.length;i++){
  module.exports[functions_to_export[i].name] = functions_to_export[i];
}
