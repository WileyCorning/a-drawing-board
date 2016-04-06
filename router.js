/*
  Module to serve webpage content in response to client requests.
  Attempts to authenticate client if cookie is provided.
*/

var express = require('express');
var jwt = require('jsonwebtoken');

var JWT_KEY = 'unsecure key';

module.exports = function(dbqm) {
  var router = express.Router();

  // Set user ID and access level according to token, if one is supplied
  router.use(function(req, res, next) {
    var token = req.cookies['token'];
    if(token){
      try {
        jwt.verify(token, JWT_KEY, function(err, decoded) {
          if(err) throw err;
          dbqm.get_user_access([decoded['user_id']],function(rows){
            res.locals.user_id = decoded['user_id'];
            res.locals.username = decoded['username'];
            var flattened = rows.map(function(r){return r['level'];});
            res.locals.user_access = flattened;
            next();
          });
        });
      }
      catch(err) {
        console.log('JWT decode error:',err);
        res.locals.user_access=['guest'];
        next();
      }
    }
    else {
      res.locals.user_access=['guest'];
      next();
    }
  });

  router.get('/', function(req, res){
  //var q = 'SELECT user.name AS author, post.content AS content FROM user INNER JOIN post ON user.pk_user = post.fk_user_author;';
    dbqm.get_all_posts([],function(rows) {
      console.log('UID',res.locals.user_id);
      res.render('display-all.jade',{prefill:rows});
    });
  });

  return router;
};
