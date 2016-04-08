/*
  Module to handle all database queries in a uniform format.
*/

var DEFAULT_PROC_NAMES = [
  'create_post',
  'create_user',
  'login',
  'get_user_access',
  'get_post',
  'get_replies_to'
];

module.exports = function(database_connection,proc_names) {

  var call_procedure = function(proc_name) {
    var f = function(query_par, callback) {
      var query_str ='call '+proc_name+'('+[...'?'.repeat(query_par.length)].join(',')+');';
      var out;
      console.log(query_str,query_par);
      database_connection.query(query_str,query_par,function(err,results,fields) {
        // Handle error
        if(err) {
          console.log('Issue has occurred in procedure call:');
          console.log('\t',query_str,query_par);
          console.log('\t',err);
        }
        else {
          callback(results[0]);
        }
      });
    }
    return f;
  }

  proc_names = proc_names || DEFAULT_PROC_NAMES;

  for(var i = 0; i < proc_names.length; i++) {
    this[proc_names[i]] = call_procedure(proc_names[i]);
  }
}
