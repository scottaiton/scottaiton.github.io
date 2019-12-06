class TextParser {
  constructor(lines) {
    this.lines = lines;
    this.curr_pos = 0;
  }
  next() {
    var tokens = this.lines[this.curr_pos].trim().split(/[ ]+/);
    this.curr_pos++;
    return tokens;
  }
  hasNext() {
    return this.curr_pos < this.lines.length;
  }
  currIsEmpty() {
    return this.lines[this.curr_pos].trim() == "";
  }
}
var ReadClawAscii = {};
ReadClawAscii.parsePatch = function(parser) {
  var patch = new Patch();
  patch.grid_number = parseInt(parser.next()[0]);
  patch.amr_level = parseInt(parser.next()[0]);
  patch.block_number = parseInt(parser.next()[0]);
  //skip mpi rank
  parser.next();
  patch.mx = parseInt(parser.next()[0]);
  patch.my = parseInt(parser.next()[0]);
  patch.xlow = parseFloat(parser.next()[0]);
  patch.ylow = parseFloat(parser.next()[0]);
  patch.dx = parseFloat(parser.next()[0]);
  patch.dy = parseFloat(parser.next()[0]);

  //initialize array
  patch.q = new Array(patch.mx * patch.my);

  //read in data
  for (var i = 0; i < patch.mx * patch.my; i++) {
    while (parser.currIsEmpty()) {
      parser.next();
    }
    patch.q[i] = parseFloat(parser.next()[0]);
  }
  return patch;
};
ReadClawAscii.readFile = function(file, callback) {
  console.log(file.name);
  var patches = new Array();
  var reader = new FileReader();
  reader.onload = function(e) {
    const file = e.target.result;
    var parser = new TextParser(file.split(/\r\n|\n/));
    while (parser.hasNext()) {
      if (parser.currIsEmpty()) {
        parser.next();
      } else {
        var patch = ReadClawAscii.parsePatch(parser);
        patches.push(patch);
      }
    }
    callback(patches);
  };

  reader.onerror = event => {
    alert(event.target.error.name);
  };
  reader.readAsText(file);
};
