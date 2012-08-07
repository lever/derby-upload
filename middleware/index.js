var pathRegexp = require('express/lib/utils').pathRegexp
  , parse = require('connect').utils.parseUrl
  , multipart = require('connect/lib/middleware/multipart')
  , fkstream = require('fkstream')
  , pathUtils = require('path')
  , knox = require('knox')
  , knoxUtils = knox.utils
  , fs = require('fs');

// A wrapper for the enhanced version of Connect's multipart middleware
exports = module.exports = function(app, options){

  options = options || {};

  // Set defaults
  options.path = options.path || '*';

  // Add a route handling the upload request in case it's not been caught to
  // avoid 404 (by using Derby routes we allow for intervening routes)
  app.post(options.path, function(page, model, params, next) {
    page._res.send(200);
  });

  return function derbyUploadMiddleware(req, res, next) {
    var re = pathRegexp(options.path, [], false, false)
      , path = parse(req).pathname;

    // If path doesn't match - use regular multipart
    if(! re.test(path)) return multipart(options)(req, res, next);

    var knoxOpts = options.knox;

    if (! knoxOpts) return multipart(options)(req, res, next);

    // If knox is sent as parameters, then stream file to knox

    // Set knox.callbacks as empty object as default
    var callbacks = knoxOpts.callbacks = knoxOpts.callbacks || {}
      , stream = knoxOpts.stream;
    // Either by streaming straight to S3 without touching disk. Be aware of possible memory clogging using this method
    // This requires x-file-size to be set as header on the request (and be valid).
    // This also requires only one file to be uploaded per request
    if(stream && req.headers['x-file-size']) {
      // Streaming is done by modifying onPart using fkstream
      options.onPart = fkstream((knoxOpts.auth || {}), (knoxOpts.directory || ''), (knoxOpts.headers || {}), callbacks);
      return multipart(options)(req, res, next);
    }

    // Or after file has been successfully saved to disk
    // By modifying the callback after multipart/formidable successfully have processed the file(s)
    var originalNext = next;
    next = function (err) {
      // On error - just pass the error along
      if (err) return originalNext(err);

      var anyFilesStreamed = false
        , client = knox.createClient(knoxOpts.auth)
        , files = req.files;

      for (var key in files) {
        var file = files[key]
          , headers = knoxUtils.merge(
              {
                'Content-Length': file.size
              , 'Content-Type': file.type
              }
            , (knoxOpts.headers || {}) )
          , fileReadStream = fs.createReadStream(file.path)
          , uploadPath = pathUtils.join(((knoxOpts.directory || '') || ''), file.name);

        uploadPath = sanitizeFilename(uploadPath);

        anyFilesStreamed = true;

        client.putStream(fileReadStream, uploadPath, headers, function (err, res) {
          // Destroy the stream reading the file and remove the file from tmp dir / file system
          fileReadStream.destroy();
          fs.unlink(file.path);

          // Set upload path on AWS/S3 as new file.path
          file.path = uploadPath;

          if (callbacks.putStream) callbacks.putStream.apply(null, arguments);

          // Wait for streaming to complete before moving on, to ensure no
          // files are messed around with before they're streamed to AWS/S3
          originalNext();
        });
      }

      if(!anyFilesStreamed) originalNext();
    };

    // At last, after modifying options (or the next callback), create multipart middleware with new options and call it
    multipart(options)(req, res, next);
  }
};

function sanitizeFilename (filename) {
  return filename.trim().replace(/\A.*(\\|\/)/g, '').replace(/[^\w\.\-]/g, '_');
}
