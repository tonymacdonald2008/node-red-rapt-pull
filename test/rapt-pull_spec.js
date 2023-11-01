var helper = require("node-red-node-test-helper");
var wrapNode = require("../rapt-pull.js");

describe('rapt-pull Node', function () {
  
  beforeEach(function (done) {
      helper.startServer(done);
  });

  afterEach(function (done) {
      helper.unload();
      helper.stopServer(done);
  });

  it('should be loaded', function (done) {
    var flow = [{ id: "n1", type: "rapt-pull", name: "test name" }];
    helper.load(wrapNode, flow, function () {
      var n1 = helper.getNode("n1");
      n1.should.have.property('name', 'test name');
      done();
    });
  });


});