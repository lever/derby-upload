var derby = require('derby')
    // Require Express Utils lib for route parsing
  , utils = require('express/lib/utils')
    // And we also need parse for route parsing
  , parse = require('connect').utils.parseUrl
  , multipart = require('connect/lib/middleware/multipart')
  , fkstream = require('fkstream');

// A wrapper for the enhanced version of Connect's multipart middleware
exports = module.exports = function(app, options){

  options = options || {};
  options.derbyUpload = options.derbyUpload || {};
  // Set defaults
  options.derbyUpload.path = options.derbyUpload.path || '*';

  // Add a route handling the upload request in case it's not been caught to avoid 404 (by using Derby routes we allow for intervening routes)
  app.post(options.derbyUpload.path, function(page, model, params, next) {
    page._res.send(200);
  });

  return function derbyUploadMiddleware(req, res, next) {

    if( !utils.pathRegexp(options.derbyUpload.path, [], false, false).test( parse(req).pathname ) ) {
      // If path doesn't match - use regular multipart
      multipart(options)(req, res, next); 
    } else {
      // If knox is sent as parameters, then stream file straight to knox
      if(options.derbyUpload.knox) {
        // By modifying onPart using fkstream
        options.onPart = fkstream((options.derbyUpload.knox.auth || {}), (options.derbyUpload.directory || ''), (options.derbyUpload.knox.headers || {}), (options.derbyUpload.knox.callbacks || {}));
      }

      // At last, after modifying options, create multipart middleware with new options and call it
      multipart(options)(req, res, next);
    }
  }
  
};
