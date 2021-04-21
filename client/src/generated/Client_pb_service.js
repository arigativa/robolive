// package: 
// file: Client.proto

var Client_pb = require("./Client_pb");
var Common_pb = require("./Common_pb");
var grpc = require("@improbable-eng/grpc-web").grpc;

var ClientEndpoint = (function () {
  function ClientEndpoint() {}
  ClientEndpoint.serviceName = "ClientEndpoint";
  return ClientEndpoint;
}());

ClientEndpoint.Join = {
  methodName: "Join",
  service: ClientEndpoint,
  requestStream: false,
  responseStream: false,
  requestType: Client_pb.JoinRequest,
  responseType: Client_pb.JoinResponse
};

ClientEndpoint.AddUiDescription = {
  methodName: "AddUiDescription",
  service: ClientEndpoint,
  requestStream: false,
  responseStream: false,
  requestType: Client_pb.AddUIDescriptionRequest,
  responseType: Common_pb.Empty
};

ClientEndpoint.GetUiDescription = {
  methodName: "GetUiDescription",
  service: ClientEndpoint,
  requestStream: false,
  responseStream: false,
  requestType: Client_pb.GetUIDescriptionRequest,
  responseType: Client_pb.UIDescription
};

exports.ClientEndpoint = ClientEndpoint;

function ClientEndpointClient(serviceHost, options) {
  this.serviceHost = serviceHost;
  this.options = options || {};
}

ClientEndpointClient.prototype.join = function join(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(ClientEndpoint.Join, {
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

ClientEndpointClient.prototype.addUiDescription = function addUiDescription(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(ClientEndpoint.AddUiDescription, {
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

ClientEndpointClient.prototype.getUiDescription = function getUiDescription(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(ClientEndpoint.GetUiDescription, {
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

exports.ClientEndpointClient = ClientEndpointClient;

