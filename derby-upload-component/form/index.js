 exports.create = function(model, dom) {
  this.next_file_to_be_uploaded = 0;
  this.uploading = false;
  this.action = dom.element('form').getAttribute('action');
};

exports._fileInputChange = function(e, el, next) {
  addFilesToQueue.call(this, el.files, el.dataset['uploadurl'] );
};

exports._filesDropped = function(e, el, next) {
  e.preventDefault();
  e.stopPropagation();

  addFilesToQueue.call(this, e.dataTransfer.files, el.dataset['uploadurl'] );
};

function addFilesToQueue(files, url) {
  var files_length = files.length;

  for(var i = 0, file; file = files[i]; ++i) {
    this.files.push({
        name: file.name
      , file: file
      // Status: {0: not started, 1: in progress, 2: finished}
      , status: 0
      , progress: 0
      , url: url
    });

    // If we are not already processing files, process the next one in queue
    if(!this.uploading) {
      uploadNext.call(this);
    }
  }
};

function uploadNext() {
  this.uploading = true;

  var formData = new FormData()
    , xhr = new XMLHttpRequest
    , file = this.active_file = this.files.at(this.next_file_to_be_uploaded);

  if( !file.get('name') ) {
    this.uploading = false;
    return false;
  }

  formData.append(file.get('name'), file.get('file'));

  // Save this for use in XHR events
  xhr.self = xhr.upload.self = this;

  // Add event handlers
  xhr.upload.addEventListener('loadstart', onloadstart, false);
  xhr.upload.addEventListener('progress', onprogress, false);
  xhr.upload.addEventListener('load', onload, false);
  xhr.addEventListener('readystatechange', onreadystatechange, false);

  // Send file
  xhr.open('POST', file.get('url') || this.action, true); // Use data attribute 'uploadurl' if available to make it possible to use form with other action
  xhr.send(formData);
};

function onloadstart(e) {
  var self = this.self;
  self.active_file.set('status', 1);
};

function onprogress(e) {
  var self = this.self;
  self.active_file.set('progress', 100*e.loaded/e.total);
};

function onload(e) {
  var self = this.self;
  self.active_file.set('status', 2);
};

function onreadystatechange(e) {
  var self = this.self
    , status = null
    , readyState = null;

  try {
    status = e.target.status;
    readyState = e.target.readyState;
  } catch(e) {
    return;
  }

  if(status === 200 && readyState === 4 && e.target.responseText) {
    // Process next in queue
    self.next_file_to_be_uploaded++;
    uploadNext.call(self);
  }

  if(status != '200') {
    self.model.set('error', true);
  }
};

// Make childs accessible
exports.init = function(model) {
  model.set('files', []);
  this.files = model.at('files');

  this.on('init:child', function(child, type) {
    if( type === 'lib:fileList' ) {
      child.model.ref('files', this.files.path());
    }
  });
};