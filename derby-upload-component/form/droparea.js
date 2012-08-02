exports.create = function(model, dom) {
  // Setup document for dropping
  document.addEventListener('dragenter', function(e){
    e.preventDefault();
    e.stopPropagation();
  }, false);

  document.addEventListener('dragover', function(e){
    e.preventDefault();
    e.stopPropagation();
  }, false);
}
