// package: 
// file: Storage.proto

var Storage_pb = require("./Storage_pb");
var grpc = require("@improbable-eng/grpc-web").grpc;

var StorageEndpoint = (function () {
  function StorageEndpoint() {}
  StorageEndpoint.serviceName = "StorageEndpoint";
  return StorageEndpoint;
}());

StorageEndpoint.Get = {
  methodName: "Get",
  service: StorageEndpoint,
  requestStream: false,
  responseStream: false,
  requestType: Storage_pb.ReadRequest,
  responseType: Storage_pb.ReadResponse
};

exports.StorageEndpoint = StorageEndpoint;

function StorageEndpointClient(serviceHost, options) {
  this.serviceHost = serviceHost;
  this.options = options || {};
}

StorageEndpointClient.prototype.get = function get(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(StorageEndpoint.Get, {
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

exports.StorageEndpointClient = StorageEndpointClient;

