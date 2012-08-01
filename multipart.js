// An enhanced version of Connect's multipart middleware (extended so that potential, optional, callbacks will be triggered upon formidable's events)

// We need to re-require/get connect/utils since we are not in express's scope anymore
// As well as formidable
// As well as qs
var
  utils = require('./node_modules/express/node_modules/connect').utils,
  formidable = require('./node_modules/express/node_modules/connect/node_modules/formidable'),
  qs = require('./node_modules/express/node_modules/connect/node_modules/qs');

exports = module.exports = function(options){
  options = options || {};
  return function multipart(req, res, next) {

    if (req._body) return next();
    req.body = req.body || {};
    req.files = req.files || {};

    // ignore GET
    if ('GET' == req.method || 'HEAD' == req.method) return next();

    // check Content-Type
    if ('multipart/form-data' != utils.mime(req)) return next();

    // flag as parsed
    req._body = true;

    // parse
    var form = new formidable.IncomingForm
      , data = {}
      , files = {}
      , done;

    Object.keys(options).forEach(function(key){
      form[key] = options[key];
    });

    function ondata(name, val, data){
      if (Array.isArray(data[name])) {
        data[name].push(val);
      } else if (data[name]) {
        data[name] = [data[name], val];
      } else {
        data[name] = val;
      }
    }

    form.on('field', function(name, val){
      ondata(name, val, data);
    });

    form.on('file', function(name, val){
      ondata(name, val, files);
    });

    form.on('error', function(err){
      next(err);
      done = true;
    });

    form.on('end', function(){
      if (done) return;
      try {
        req.body = qs.parse(data);
        req.files = qs.parse(files);
        next();
      } catch (err) {
        next(err);
      }
    });

    // Add req, res to form object to be able to access req and res from within event callbacks
    form.req = req;
    form.res = res;

    // For each event, check if callback was passed and if so, add it to be triggered
    ['progress','field','fileBegin','file','error','aborted','end'].forEach(function(key){
      
      var
        callback = 'on' + key;
      
      if( typeof options[callback] === 'function' ) {
        
        form.on(key, options[callback]);
        
      }
      
    });

    form.parse(req);
  }
};