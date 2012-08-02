var 
  config = {
      ns: 'derbyupload'
    , filename: __filename
    , scripts: {
        form: require('./form')
      , fileInput: {}
      , dropArea: require('./form/droparea')
      , fileList: {}
      }
    };

module.exports = derby_upload
derby_upload.decorate = 'derby'

function derby_upload(derby, options) {
  derby.createLibrary(config, options);
}