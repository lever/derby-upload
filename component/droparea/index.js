// dropArea

var shared = require('../shared')
  , addFilesToQueue = shared.addFilesToQueue
  , setupUploadingFlag = shared.setupUploadingFlag
  , closestElem = shared.closestElem;

exports.init = function (model, dom) {
  var $files = this.files = model.at('files');
  var $list = this.fileList = $files.at('list');
  $list.setNull([]);
};

exports.create = function (model, dom) {
  setupUploadingFlag(this);
  var dropEl = dom.element('divdrop');
  this.action = closestElem(dropEl, 'form').getAttribute('action');
};

exports.addHoverClass = function (e, el, next) {
  e.preventDefault();
  e.stopPropagation();
  el.className = el.className + ' hover';
};

exports.removeHover = function (e, el, next) {
  e.preventDefault();
  e.stopPropagation();
  el.className = el.className.replace(' hover', '');
};

/* x-bind callbacks */
exports.onFileDrop = function(e, el, next) {
  e.preventDefault();
  e.stopPropagation();

  el.className = el.className.replace(' hover', '');
  addFilesToQueue(this, e.dataTransfer.files, el.dataset['uploadurl'] || this.action);
};
