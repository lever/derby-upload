module.exports = plugin;
plugin.decorate = 'derby'

var config = {
  ns: 'derbyupload'
, filename: __filename
, scripts: {
    droparea: require('./droparea')
  , fileinput: require('./input')
  }
};

function plugin(derby, options) {
  var library = derby.createLibrary(config, options);
  library.view.fn('uploading', function(file) {
    return file && (file.status === 0 || file.status === 1);
  });
}
