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
  var dropEl = dom.element('divdrop');
  this.action = dropEl.closest('form').getAttribute('action');
};

exports.addHoverClass = function (e, el, next) {
  e.preventDefault();
  e.stopPropagation();
  el.className = 'hover';
};

exports.removeHover = function (e, el, next) {
  e.preventDefault();
  e.stopPropagation();
  el.className = '';
};

/* x-bind callbacks */
exports.onFileDrop = function(e, el, next) {
  e.preventDefault();
  e.stopPropagation();

  el.className = '';
  addFilesToQueue(this, e.dataTransfer.files, el.dataset['uploadurl'] );
};