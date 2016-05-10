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
          if(err) {
            console.log('JWT decode error:',err);
            res.locals.user_access=['guest'];
            next();
          }
          else {
            dbqm.get_user_access(
              [decoded['user_id']],
              function(rows){
                res.locals.user_id = decoded['user_id'];
                res.locals.username = decoded['username'];
                var flattened = rows.map(function(r){return r['level'];});
                res.locals.user_access = flattened;
                next();
              },
              function(err){
                console.log(err);
                next();
              }
            );
          }
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

  router.get('/',function(req,res){
    res.render('front.jade');
  });

  router.get('/:pid([0-9]+)', function(req, res){
    var pid = req.params['pid'];
    dbqm.get_post([pid],function(rows){
      var parent = rows[0]
      res.render('post_and_replies.jade',{parent:rows[0]},function(err,html){
        if(err){console.log(err);res.send('500');}
        else{res.send(html);}
      });
    });
  });

  router.get('/u/:uid([0-9]+)',function(req,res){
    var uid = req.params['uid'];
    res.render('user.jade',{user:{user_id: uid}},function(err,html){
      if(err){console.log(err);res.send('500');}
      else{res.send(html);}
    });
  })

  return router;
};
