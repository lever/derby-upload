module.exports = exports = require('../input');

exports.create = function(model, dom) {
  // fileinput within a droparea should inherit options from its container
  this.on('create:descendant', function(component, type) {
    if (type !== 'lib:fileinput') return;
    component.model.ref('url', model.at('url'));
    component.model.ref('files', model.at('files'));
    component.model.ref('remove-done', model.at('remove-done'));
  });
};

exports.enter = function(e, el) {
  console.log('enter')
  e.preventDefault();
  e.stopPropagation();
  el.classList.add('hover');
};

exports.leave = function(e, el) {
  console.log('leave')
  e.preventDefault();
  e.stopPropagation();
  el.classList.remove('hover');
};

exports.drop = function(e, el) {
  this.leave(e, el);
  this.addFilesToQueue(e.dataTransfer.files);
};
