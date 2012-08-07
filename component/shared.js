module.exports = {
  addFilesToQueue: addFilesToQueue
, setupUploadingFlag: setupUploadingFlag
, shimClosest: shimClosest
}

function addFilesToQueue(component, files, url) {
  for (var i = 0, l = files.length; i < l; i++) {
    var file = files[i];
    component.fileList.push({
      name: file.name
    , file: file
    // Status: {0: not started, 1: in progress, 2: finished}
    , status: 0
    , progress: 0
    , url: url
    });

    // If we are not already processing files, process the next one in queue
    component.isUploading() || uploadNext(component);
  }
};

function indexOf (array, predicate) {
  for (var i = 0, l = array.length; i < l; i++) {
    if (predicate(array[i])) return i;
  }
  return -1;
}

function uploadNext(component) {
  var formData = new FormData()
    , xhr = new XMLHttpRequest
    , file = component.activeFile = component.files.at(component.nextFileToBeUploaded);

  var list = component.fileList.get();
  var index = indexOf(list, function (file) { return file.status === 0; });
  if (-1 === index) return;

  var file = list[index];
  component.activeFile = component.fileList.at(index);

  formData.append(file.name, file.file);

  // Save this for use in XHR events
  xhr.component = xhr.upload.component = component;

  // Add event handlers
  xhr.upload.addEventListener('loadstart', onloadstart, false);
  xhr.upload.addEventListener('progress', onprogress, false);
  xhr.upload.addEventListener('load', onload, false);
  xhr.addEventListener('readystatechange', onreadystatechange, false);

  // Open XHR
  xhr.open('POST', file.url || component.action, true); // Use data attribute 'uploadurl' if available to make it possible to use form with other action

  // Add file size (required for streaming straight to S3 without touching disk)
  xhr.setRequestHeader("X-File-Size", file.file.size);

  // Send file
  xhr.send(formData);
};

/* xhr upload listener callbacks */

function onloadstart(e) {
  var component = this.component;
  component.activeFile.set('status', 1);
};

function onprogress(e) {
  var component = this.component;
  component.activeFile.set('progress', 100 * e.loaded/e.total);
};

function onload(e) {
  var component = this.component;
  component.activeFile.set('status', 2);
};

function onreadystatechange(e) {
  var component = this.component
    , status = null
    , readyState = null
    , target = e.target;

  if (!target) return;

  var status;
  try {
    status = target.status;
  } catch (e) {
    return;
  }

  if(status === 200 && target.readyState === 4 && target.responseText) {
    return uploadNext(component);
  }

  if(status !== 200) {
    component.model.set('error', true);
  }
};

function setupUploadingFlag (component) {
  if (component.isUploading) return;
  component.isUploading = function () {
    var list = this.files.get('list')
      , len = list.length;
    if (! len) return false;
    for (var i = 0; i < len; i++) {
      // Status: {0: not started, 1: in progress, 2: finished}
      if (list[i].status === 1) return true;
    }
    return false;
  }
}

function shimClosest () {
  var proto = HTMLElement.prototype;
  if (proto.closest) return;
  proto.closest = function (selector) {
    for (var x = this; x = x.parentElement; ) {
      if (x.matches(selector)) return x;
    }
  }
}
