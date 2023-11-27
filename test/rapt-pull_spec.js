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
    var flow = [{ id: "n1", type: "rapt-pull", name: "test name"}];
    helper.load(wrapNode, flow, function () {
      var n1 = helper.getNode("n1");
      n1.should.have.property('name', 'test name');
      done();
    });
  });
  
  it('should error on bad object', function (done) {
    var flow = [{ id: "n1", type: "rapt-pull", name: "", endpoint: "GetHydrometer" ,wires:[["n2"]] },
    { id: "n2", type: "helper" }];
    helper.load(wrapNode, flow, function () {
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");
      n1.receive({payload: {name: "myname"}});
      n1.on('call:error', call => {
        call.should.be.calledWith('no hydrometerId found');
        done();
      });
    });
  });
  
  it('should error on bad array', function (done) {
    var flow = [{ id: "n1", type: "rapt-pull", name: "", endpoint: "GetHydrometer" ,wires:[["n2"]] },
    { id: "n2", type: "helper" }];
    helper.load(wrapNode, flow, function () {
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");
      n1.receive({payload: [{name: "myname"}]});
      n1.on('call:error', call => {
        call.should.be.calledWith('no hydrometerId found');
        done();
      });
    });
  });
  
  it('should error on bad payload', function (done) {
    var flow = [{ id: "n1", type: "rapt-pull", name: "", endpoint: "GetHydrometer" ,wires:[["n2"]] },
    { id: "n2", type: "helper" }];
    helper.load(wrapNode, flow, function () {
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");
      n1.receive({payload: "hydrometerid"});
      n1.on('call:error', call => {
        call.should.be.calledWith('no hydrometerId found');
        done();
      });
    });
  });



});