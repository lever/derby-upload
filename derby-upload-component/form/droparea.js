exports.create = function(model, dom) {
  // Setup document for dropping
  dom.addListener(document.documentElement, 'dragenter', function(e){
    e.preventDefault();
    e.stopPropagation();
  }, false);

  dom.addListener(document.documentElement, 'dragover', function(e){
    e.preventDefault();
    e.stopPropagation();
  }, false);
}
