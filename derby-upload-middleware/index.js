var derby = require('derby')
    // Require Express Utils lib for route parsing
  , utils = require('express/lib/utils')
    // And we also need parse for route parsing
  , parse = require('connect').utils.parseUrl
  , multipart = require('connect/lib/middleware/multipart');

// A wrapper for the enhanced version of Connect's multipart middleware
exports = module.exports = function(app, options){

  options = options || {};

  var path = options.path || '*';

  // Add a route handling the upload request in case it's not been caught to avoid 404 (by using Derby routes we allow for intervening routes)
  app.post(path, function(page, model, params, next) {
    page._res.send(200);
  });

  return function derbyUploadMiddleware(req, res, next) {

    if( !utils.pathRegexp(path, [], false, false).test( parse(req).pathname ) ) {
      multipart(options)(req, res, next); 
    } else {
      

      // At last, after modifying options, create multipart middleware with new options and call it
      multipart(options)(req, res, next);
    }
  }
  
};
