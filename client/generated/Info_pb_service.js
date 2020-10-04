// package: 
// file: Info.proto

var Info_pb = require("./Info_pb");
var grpc = require("@improbable-eng/grpc-web").grpc;

var InfoEndpoint = (function () {
  function InfoEndpoint() {}
  InfoEndpoint.serviceName = "InfoEndpoint";
  return InfoEndpoint;
}());

InfoEndpoint.AgentList = {
  methodName: "AgentList",
  service: InfoEndpoint,
  requestStream: false,
  responseStream: false,
  requestType: Info_pb.AgentListRequest,
  responseType: Info_pb.AgentListResponse
};

exports.InfoEndpoint = InfoEndpoint;

function InfoEndpointClient(serviceHost, options) {
  this.serviceHost = serviceHost;
  this.options = options || {};
}

InfoEndpointClient.prototype.agentList = function agentList(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(InfoEndpoint.AgentList, {
    request: requestMessage,
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport,
    debug: this.options.debug,
    onEnd: function (response) {
      if (callback) {
        if (response.status !== grpc.Code.OK) {
          var err = new Error(response.statusMessage);
          err.code = response.status;
          err.metadata = response.trailers;
          callback(err, null);
        } else {
          callback(null, response.message);
        }
      }
    }
  });
  return {
    cancel: function () {
      callback = null;
      client.close();
    }
  };
};

exports.InfoEndpointClient = InfoEndpointClient;

