// package: 
// file: Agent.proto

var Agent_pb = require("./Agent_pb");
var grpc = require("@improbable-eng/grpc-web").grpc;

var AgentEndpoint = (function () {
  function AgentEndpoint() {}
  AgentEndpoint.serviceName = "AgentEndpoint";
  return AgentEndpoint;
}());

AgentEndpoint.Register = {
  methodName: "Register",
  service: AgentEndpoint,
  requestStream: true,
  responseStream: true,
  requestType: Agent_pb.AgentMessage,
  responseType: Agent_pb.RegistryMessage
};

exports.AgentEndpoint = AgentEndpoint;

function AgentEndpointClient(serviceHost, options) {
  this.serviceHost = serviceHost;
  this.options = options || {};
}

AgentEndpointClient.prototype.register = function register(metadata) {
  var listeners = {
    data: [],
    end: [],
    status: []
  };
  var client = grpc.client(AgentEndpoint.Register, {
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport
  });
  client.onEnd(function (status, statusMessage, trailers) {
    listeners.status.forEach(function (handler) {
      handler({ code: status, details: statusMessage, metadata: trailers });
    });
    listeners.end.forEach(function (handler) {
      handler({ code: status, details: statusMessage, metadata: trailers });
    });
    listeners = null;
  });
  client.onMessage(function (message) {
    listeners.data.forEach(function (handler) {
      handler(message);
    })
  });
  client.start(metadata);
  return {
    on: function (type, handler) {
      listeners[type].push(handler);
      return this;
    },
    write: function (requestMessage) {
      client.send(requestMessage);
      return this;
    },
    end: function () {
      client.finishSend();
    },
    cancel: function () {
      listeners = null;
      client.close();
    }
  };
};

exports.AgentEndpointClient = AgentEndpointClient;

