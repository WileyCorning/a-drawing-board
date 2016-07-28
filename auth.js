
var jwt = require('jsonwebtoken');
var util = require('./util')
var assert = require('assert');

var JWT_KEY = 'Unsecure';

module.exports = new (function(){
  var self = this;

  // Resolves true if the user has the specified permission level, false else
  self.checkPermission = function(db,user_id,level){
    // TODO cache these
    return util.getUserPermissions(db,user_id).then(function(permissions){
      return (permissions.indexOf(level)>-1);
    });
  }

  // Resolves iff the user has the required permission level
  self.requirePermission = function(db,user_id,level){
    return self.checkPermission(db,user_id,level).then(function(has_permission){
      assert(has_permission,'User does not have required permission \"'+level+'\"');
    });
  }

  // Resolves with a token containing user_id and name
  self.authenticate = function(db,username,password) {
    return util.findUserID(db,username).then(function(user_id){
      return util.checkPassword(db,user_id,password).then(function(password_correct){
        assert(password_correct,'Provided password was not correct');
        // Construct token to send to client
        return jwt.sign({user_id: user_id,  username: username}, JWT_KEY, {expiresIn: '12h'});
      });
    });
  }

  // Resolves with the user_id
  self.authenticateFromToken = function(token) {
    return new Promise(function(resolve,reject){
      try {
        jwt.verify(token,JWT_KEY,function(err,decoded){
          if(err) throw err;
          resolve({user_id:decoded.user_id,username:decoded.username});
        });
      }
      catch(err){
        reject(err);
      }
    });
  }
})();
