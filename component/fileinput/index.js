var uuid = require('node-uuid')
  , path = require('path');

exports.init = function(model) {
  model.setNull('multiple', true)
}
exports.inputChange = function(e, el) {
  this.addFilesToQueue(el.files);
  el.value = null;
  this.emit("submit", e, el)
};

exports.addFilesToQueue = function(files) {
  for (var i = 0, l = files.length; i < l; i++) {
    var file = files[i]
      , filename = file.name
      , ext = path.extname(filename)
      , base = path.basename(filename, ext)
    this.model.push('files', {
      id: uuid.v4()
    , name: base
    , ext: ext
    , file: file
    // Status: {0: not started, 1: in progress, 2: finished}
    , status: 0
    , progress: 0
    });
  }
  // If we are not already processing files, process the next one in queue
  var list = this.model.get('files');
  isUploading(list) || this.uploadNext();
};

exports.uploadNext = function() {
  var list = this.model.get('files')
    , index = nextWaiting(list);
  if (-1 === index) return;

  var formData = new FormData()
    , xhr = new XMLHttpRequest
    , file = list[index];
  this.activeFile = this.model.at('files.' + index);

  formData.append(file.id + file.ext, file.file);

  // Save this for use in XHR events
  xhr.component = xhr.upload.component = this;

  // Add event handlers
  xhr.upload.addEventListener('loadstart', onloadstart, false);
  xhr.upload.addEventListener('progress', onprogress, false);
  xhr.upload.addEventListener('load', onload, false);
  xhr.addEventListener('readystatechange', onreadystatechange, false);

  var url = this.model.get('url');
  // Open XHR
  xhr.open('POST', url, true);

  // Add file size (required for streaming straight to S3 without touching disk)
  xhr.setRequestHeader("X-File-Size", file.file.size);

  // Send file
  xhr.send(formData);
};

function isUploading(list) {
  if (!list) return false;
  for (var i = 0, len = list.length; i < len; i++) {
    // Status: {0: not started, 1: in progress, 2: finished}
    if (list[i].status === 1) return true;
  }
  return false;
}

function nextWaiting(list) {
  if (!list) return -1;
  for (var i = 0, l = list.length; i < l; i++) {
    if (list[i].status === 0) return i;
  }
  return -1;
}

/* xhr upload listener callbacks */
function onloadstart(e) {
  this.component.activeFile.set('status', 1);
}
function onprogress(e) {
  this.component.activeFile.set('progress', 100 * e.loaded/e.total);
}
function onload(e) {
  this.component.activeFile.set('status', 2);
  this.component.activeFile.del('progress');
}
function onreadystatechange(e) {
  try {
    var target = e.target
      , status = target.status;
  } catch (err) {
    return;
  }
  if (status === 200 && target.readyState === 4 && target.responseText) {
    if (this.component.model.get('remove-done')) {
      this.component.activeFile.remove();
    }
    if(this.component.model.get('responses')) {
      try {
        var json = JSON.parse(this.response);
        this.component.model.push('responses', json);
      } catch (e) { }
    }
    return this.component.uploadNext();
  }
  if (status !== 200) {
    this.component.model.set('error', true);
  }
}
