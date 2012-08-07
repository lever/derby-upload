// fileInput

var shared = require('../shared')
  , addFilesToQueue = shared.addFilesToQueue
  , setupUploadingFlag = shared.setupUploadingFlag
  , closestElem = shared.closestElem;

exports.init = function (model) {
  var $files = this.files = model.at('files');
  var $list = this.fileList = $files.at('list');
  $list.setNull([]);
  setupUploadingFlag(this);
};

exports.create = function (model, dom) {
  this.action = closestElem(dom.element('fileinput'), 'form').getAttribute('action');
};

/* x-bind callbacks */
exports.onFileInputChange = function(e, el, next) {
  addFilesToQueue(this, el.files, el.dataset['uploadurl'] );
};
