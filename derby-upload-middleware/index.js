var utils = require('express/lib/utils')
  , parse = require('connect').utils.parseUrl
  , multipart = require('connect/lib/middleware/multipart')
  , fkstream = require('fkstream')
  , path = require('path')
  , knox = require('knox')
  , knoxUtils = knox.utils
  , fs = require('fs');

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
      // If knox is sent as parameters, then stream file to knox
      if(options.derbyUpload.knox) {
        // Set knox.callbacks as empty object as default
        options.derbyUpload.knox.callbacks = options.derbyUpload.knox.callbacks || {};
        // Either by streaming straight to S3 without touching disk. Be aware of possible memory clogging using this method
        // This requires x-file-size to be set as header on the request (and be valid).
        // This also requires only one file to be uploaded per request
        if(options.derbyUpload.knox.stream && req.headers['x-file-size']) {
          // Streaming is done by modifying onPart using fkstream
          options.onPart = fkstream((options.derbyUpload.knox.auth || {}), (options.derbyUpload.knox.directory || ''), (options.derbyUpload.knox.headers || {}), options.derbyUpload.knox.callbacks);
        } else {
          // Or after file has been successfully saved to disk
          // By modifying the callback after multipart/formidable successfully have processed the file(s)
          var originalNext = next;

          next = function (err) {
            // On error - just pass the error along
            if(arguments.length) {
              originalNext(err);
              return;
            }

            var anyFilesStreamed = false;

            var client = knox.createClient(options.derbyUpload.knox.auth);
            for(var key in req.files) {
              var file = req.files[key]
                , headers = knoxUtils.merge(
                    {
                        'Content-Length': file.size
                      , 'Content-Type': file.type
                    }
                  , (options.derbyUpload.knox.headers || {})
                )
                , fileReadStream = fs.createReadStream(file.path)
                , uploadPath = path.join(((options.derbyUpload.knox.directory || '') || ''), file.name);

              anyFilesStreamed = true;

              client.putStream(fileReadStream, uploadPath, headers, function() {
                // Destory the stream reading the file and remove the file from tmp dir / file system
                fileReadStream.destroy();
                fs.unlink(file.path);

                // Set upload path on AWS/S3 as new file.path
                file.path = uploadPath;

                if(typeof options.derbyUpload.knox.callbacks.putStream !== 'undefined') {
                  options.derbyUpload.knox.callbacks.putStream(arguments);
                }

                // Wait for streaming to be complete before moving on in order to make sure no files are messed around with before they're streamed to AWS/S3
                originalNext();
              });
            }

            if(!anyFilesStreamed) {
              originalNext();
            }
          };
        }
      }

      // At last, after modifying options (or the next callback), create multipart middleware with new options and call it
      multipart(options)(req, res, next);
    }
  }

};
