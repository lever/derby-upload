// dropArea

var shared = require('../shared')
  , addFilesToQueue = shared.addFilesToQueue
  , setupUploadingFlag = shared.setupUploadingFlag
  , shimClosest = shared.shimClosest;

exports.init = function (model, dom) {
  var $files = this.files = model.at('files');
  var $list = this.fileList = $files.at('list');
  $list.setNull([]);
};

exports.create = function (model, dom) {
  shimClosest();
  setupUploadingFlag(this);
  this.action = dom.element('divdrop').closest('form').getAttribute('action');

  // Setup document for dropping
  var elem = document.documentElement;
  dom.addListener(elem, 'dragenter', stop, false);
  dom.addListener(elem, 'dragover', stop, false);
};

function stop (e) {
  e.preventDefault();
  e.stopPropagation();
}

/* x-bind callbacks */
exports.onFileDrop = function(e, el, next) {
  e.preventDefault();
  e.stopPropagation();

  addFilesToQueue(this, e.dataTransfer.files, el.dataset['uploadurl'] );
};
