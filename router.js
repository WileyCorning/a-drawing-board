/*
  Module to serve webpage content in response to client requests.
  Attempts to authenticate client if cookie is provided.
*/

var express = require('express');
var jwt = require('jsonwebtoken');

var util = require('./util');
var auth = require('./auth');

var JWT_KEY = 'unsecure key';

module.exports = function(db){
  var router = express.Router();

  // Set user ID and access level according to token, if one is supplied
  router.use(function(req, res, next) {
    if(req.cookies && 'token' in req.cookies){
      var token = req.cookies.token;
      auth.authenticateFromToken(token).then(
        function(data){
          res.locals.user = data;
          next();
        },
        function(err){
          console.log(err);
          next();
        }
      );
    }
    else {
      next();
    }
  });


  router.get('/',function(req,res){
    res.render('front.jade');//,{user:{user_id:3,username:"Not real"}});
  });

  router.get('/p/:post_id([a-zA-Z0-9\-_]+)',function(req,res){
    util.getPostDetails(db,req.params.post_id).then(
      function(post_info){
        console.log(post_info);
        res.render('post-display.jade',{main_post:post_info});
      },
      function(err){
        console.log(err);
      }
    );
  });

  router.get('/u/:user_id([a-zA-Z0-9\-_]+)',function(req,res){
    util.getUserDetails(db,req.params.user_id).then(
      function(user_info){
        console.log(user_info);
        res.render('user-display.jade',{main_user:user_info});
      },
      function(err){
        console.log(err);
      }
    );
  });
  return router;
}
/*
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

  router.get('/p/:pid([0-9]+)', function(req, res){
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
*/
