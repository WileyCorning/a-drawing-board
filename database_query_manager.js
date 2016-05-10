/*
  Module to handle all database queries in a uniform format.
*/

var DEFAULT_PROC_NAMES = [
  'create_post',
  'create_user',
  'login',
  'get_user_access',
  'get_post',
  'get_replies_to',
  'get_posts_by',
  'set_vote'
];

var ESE_PREF_LEN = 'ER_SIGNAL_EXCEPTION: '.length

module.exports = function(database_connection,proc_names) {

  var call_procedure = function(proc_name) {
    var f = function(query_par, callback_success, callback_failure) {
      var query_str ='call '+proc_name+'('+[...'?'.repeat(query_par.length)].join(',')+');';
      console.log(query_str,query_par);
      database_connection.query(query_str,query_par,function(err,results,fields) {
        // Handle error thrown during procedure
        if(err) {
          if(err.sqlState=='45000'){
            // Inform client of manually defined errors
            callback_failure(err.message.slice(ESE_PREF_LEN));
          }
          else {
            console.log('Unexpected issue in procedure call:');
            console.log('\t',query_str,query_par);
            console.log('\t',err);
            callback_failure('Unexpected server error');
          }
        }
        else {
          callback_success(results[0]);
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
