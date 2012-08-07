module.exports = plugin;
plugin.decorate = 'derby'

var config = {
  ns: 'derbyupload'
, filename: __filename
, scripts: {
    droparea: require('./droparea')
  , fileinput: require('./input')
  , filelist: {}
  }
};


function plugin (derby, options) {
  derby.createLibrary(config, options);
}
