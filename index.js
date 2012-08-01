var
  derby = require('derby'), 
  // Require Express Utils lib for route parsing
  utils = require('./node_modules/express/lib/utils'),
  // And we also need parse for route parsing
  parse = require('./node_modules/express/node_modules/connect').utils.parseUrl,
  // Require enhanced multipart
  multipart = require('./multipart');

// A wrapper for the enhanced version of Connect's multipart middleware
exports = module.exports = function(app, options){
  
  options = options || {};
  
  var
    path = options.path || '*',
    ns = options.ns || '_derbyupload';
  
  // Add a route handling the upload request in case it's not been caught to avoid 404 (by using Derby routes we allow for intervening routes)
  app.post(path, function(page, model, params, next) {
      
      page._res
        .send(200);
      
    });
  
  return function derbyUploadMiddleware(req, res, next) {
    
    if( !utils.pathRegexp(path, [], false, false).test( parse(req).pathname ) ) {
      
      multipart(options)(req, res, next);
      
    } else {
      
      var
        model = req.getModel(),
        uploaded_files;
      
      // Add event callbacks (but make them overridable)
      options.onfileBegin = options.onfileBegin || function (name, file) {
          
          uploaded_files = model.push(
              ns + '.files', 
              {
                name: name,
                finished: false
              }
            );
          
          console.log( 'onfileBegin' );
          
        };
      
      options.onprogress = options.onprogress || function ( bytesReceived, bytesExpected ) {
          
          model.set(
              ns + '.files.' + uploaded_files + '.progress', 
              {
                progress: ( 100 * bytesReceived / bytesExpected ),
                bytesReceived: bytesReceived,
                bytesExpected: bytesExpected
              }
            );
          
          console.log( 'onprogress: ' + bytesReceived + ' - ' + bytesExpected );
          
        };
      
      options.onfile = function (name, file) {
          
          model.set(
              ns + '.files.' + uploaded_files + '.finished', 
              true
            );
          
          console.log( 'onfile' );
          
        };
      
      options.onend = function () {
          
          console.log( 'onend' );
          
        };
      
      // TODO: Add more default callbacks and clean up above
      // TODO: Better handling of multiple simultaneous uploads/files
      
      // At last, after modifying options, create multipart middleware with new options and call it
      multipart(options)(req, res, next);
      
    }
    
  }
  
};