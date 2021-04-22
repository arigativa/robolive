// package: 
// file: Session.proto

var Session_pb = require("./Session_pb");
var Common_pb = require("./Common_pb");
var grpc = require("@improbable-eng/grpc-web").grpc;

var SessionEndpoint = (function () {
  function SessionEndpoint() {}
  SessionEndpoint.serviceName = "SessionEndpoint";
  return SessionEndpoint;
}());

SessionEndpoint.GetAllowedSessions = {
  methodName: "GetAllowedSessions",
  service: SessionEndpoint,
  requestStream: false,
  responseStream: false,
  requestType: Common_pb.Empty,
  responseType: Session_pb.AllowedSessions
};

SessionEndpoint.GetEvictedSessions = {
  methodName: "GetEvictedSessions",
  service: SessionEndpoint,
  requestStream: false,
  responseStream: false,
  requestType: Common_pb.Empty,
  responseType: Session_pb.EvictedSessions
};

SessionEndpoint.GetOngoingSessions = {
  methodName: "GetOngoingSessions",
  service: SessionEndpoint,
  requestStream: false,
  responseStream: false,
  requestType: Common_pb.Empty,
  responseType: Session_pb.OngoingSessions
};

SessionEndpoint.DoAllowSession = {
  methodName: "DoAllowSession",
  service: SessionEndpoint,
  requestStream: false,
  responseStream: false,
  requestType: Session_pb.AllowSession,
  responseType: Common_pb.Empty
};

SessionEndpoint.DoEvictSession = {
  methodName: "DoEvictSession",
  service: SessionEndpoint,
  requestStream: false,
  responseStream: false,
  requestType: Session_pb.EvictSession,
  responseType: Common_pb.Empty
};

exports.SessionEndpoint = SessionEndpoint;

function SessionEndpointClient(serviceHost, options) {
  this.serviceHost = serviceHost;
  this.options = options || {};
}

SessionEndpointClient.prototype.getAllowedSessions = function getAllowedSessions(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(SessionEndpoint.GetAllowedSessions, {
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

SessionEndpointClient.prototype.getEvictedSessions = function getEvictedSessions(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(SessionEndpoint.GetEvictedSessions, {
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

SessionEndpointClient.prototype.getOngoingSessions = function getOngoingSessions(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(SessionEndpoint.GetOngoingSessions, {
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

SessionEndpointClient.prototype.doAllowSession = function doAllowSession(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(SessionEndpoint.DoAllowSession, {
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

SessionEndpointClient.prototype.doEvictSession = function doEvictSession(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(SessionEndpoint.DoEvictSession, {
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

exports.SessionEndpointClient = SessionEndpointClient;

