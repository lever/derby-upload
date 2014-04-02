var pathRegexp = require('express/lib/utils').pathRegexp
  , connect = require('connect')
  , parse = connect.utils.parseUrl
  , multipart = connect.multipart
  , fkstream = require('fkstream')
  , pathUtils = require('path')
  , knox = require('knox')
  , knoxUtils = knox.utils
  , fs = require('fs')
  , http = require('http')
  , pathUtils = require('path')
  , async = require('async')
  ;

exports = module.exports = function (options){

  // Set options to empty objects to avoid undefined errors
  options = options || {};
  options.auth = options.auth || {};
  options.headers = options.headers || {};
  options.callbacks = options.callbacks || {};
  options.formidable = options.formidable || {};
  options.keyFn = options.keyFn || function(key) { return key; };

  // Set defaults
  options.path = options.path || '*';
  options.directory = options.directory || '';
  options.removeTmp = (typeof options.removeTmp !== 'undefined' ? options.removeTmp : true);

  // Add a route handling the upload request in case it's not been caught to
  // avoid 404 (by using Derby routes we allow for intervening routes)
  if(options.derbyApp) {
    options.derbyApp.post(options.path, function(page, model, params, next) {
      page._res.send(200);
    });
  }

  var client = knox.createClient(options.auth);

  return function (req, res, next) {
    var re = pathRegexp(options.path, [], false, false)
      , path = parse(req).pathname;

    // If path doesn't match then skip uploading to AWS/S3
    if(! re.test(path)) {
      next();
      return;
    }

    // Either by streaming straight to S3 without touching disk. Be aware of possible memory clogging using this method
    // This requires x-file-size to be set as header on the request (and be valid).
    // This also requires only one file to be uploaded per request
    if(options.stream && req.headers['x-file-size']) {
      // Streaming is done by modifying onPart using fkstream
      options.formidable.onPart = fkstream(options.auth, options.directory, options.headers, options.callbacks);
      return multipart(options.formidable)(req, res, next);
    }

    // Or after file has been successfully saved to disk
    // By modifying the callback after multipart/formidable successfully have processed the file(s)
    var originalNext = next;
    next = function (err) {
      // On error - just pass the error along
      if (err) return originalNext(err);

      var anyFilesStreamed = false
        , files = req.files;

      var keys = Object.keys(files);
      async.map(keys, function(key, fileCb) {
        key = sanitizeFilename(key);
        // key looks like "#{fileId}.#{fileExt}"
        var file = files[key];
        var itemKey = options.keyFn(key, file);
        var headers = knoxUtils.merge(
              {
                'Content-Length': file.size
              , 'Content-Type': file.type
              }
            , options.headers)
          , fileReadStream = fs.createReadStream(file.path)
          , uploadPath = pathUtils.join('/', options.directory, itemKey);

        anyFilesStreamed = true;

        var knoxReq = client.putStream(fileReadStream, uploadPath, headers, function (err, knoxRes) {
          // Destroy the stream reading the file
          fileReadStream.destroy();

          if (options.removeTmp) {
            // Remove the file from tmp dir / file system and remove the path to the now non-existing file
            fs.unlink(file.path);
            delete file.path;
          }

          if (err) return originalNext(err);

          var statusCode = knoxRes.statusCode
            , statusLeadingInt = parseInt(statusCode / 100, 10);
          if (statusLeadingInt !== 2) {
            return originalNext(new Error(http.STATUS_CODES[statusCode]));
          }

          if (options.callbacks.putStream) options.callbacks.putStream.apply(null, arguments); 

          // Add data to req.files, including the url to the file (both http and https urls)
          var pair = itemKey.split('.')
            , id = pair[0], ext = '.' + pair[1];
          file = knoxUtils.merge(
              file
            , {
                  http: client.http(uploadPath)
                , https: client.https(uploadPath)
                , id: id
                , strippedName: pathUtils.basename(file.name, ext)
                , ext: ext
              });

          // Wait for streaming to complete before moving on, to ensure no
          // files are messed around with before they're streamed to AWS/S3
          // , as well as to make sure req.files is properly set
          fileCb(null, file);
        });
        knoxReq.on("error", function(err) {
          console.log("knox error", err, err.stack)
        })
      }, function(err, results) {
         originalNext(err);
      });
      if(!anyFilesStreamed) originalNext();
    };

    // At last, after modifying options.formidable (or the next callback), create multipart middleware with new options and call it
    multipart(options.formidable)(req, res, next);
  }
};

function sanitizeFilename (filename) {
  return filename.trim().replace(/\A.*(\\|\/)/g, '').replace(/[^\w\.\-]/g, '_');
}

exports.download = function (opts) {
  var client = knox.createClient(opts.auth);

  return function (req, res, next) {
    var knoxReq = client.get(req.params.filename);
    knoxReq.on('error', next);
    knoxReq.on('response', function (knoxRes) {
      knoxRes.on('error', next);
      knoxRes.pipe(res);
    });
    knoxReq.end();
  };
}
