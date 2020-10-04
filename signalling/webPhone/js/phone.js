(function() {
let webCallSession = null;
let incomingCustomHeaders = null; 
let webCallDirection,webPhoneUA, webRTCSelfView, webRTCRemoteView;
let getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
let micController, microphoneStream;

let eventSender = (object,options) => {
  let event = new CustomEvent(object,{
    detail: options
  });        
  console.log(event);
  document.dispatchEvent(event);
} 

let getFromCallerInfo = (answerHeaders) => {
  let FROM;
  if (typeof answerHeaders.From[0] === 'object'){
        FROM = answerHeaders.From[0].raw;  
    } else {
        FROM = answerHeaders.From[0];
    };
        
    if (FROM !== undefined){
        let fromNumber = FROM.split(':')[1].split('@')[0]; //e.request.headers.From[0].split(':')[1].split('@')[0];
        console.log(fromNumber);
        return fromNumber;
    };         
}

let setDirection = (originator) => {
  let direction;
  switch(originator) {
    case 'local':  
      direction = 'outgoing';
      break;
    case 'remote':
      direction = 'incoming'
      break;
    default: 
      break;
  }
  return direction;
}

let handleHeaders = (headers) => {
  let handledHeaders = [];

  for (props in headers) {
        console.log('"'+headers[props]+'"');
        if (headers[props].length > 0) {
          console.log("header "+props+": "+headers[props]+" was copied");
          handledHeaders.push(props+": "+ headers[props]);
        }
      }


  return handledHeaders;
}

/*initialize*/  
window.phoneEngine = {
  
  /*options = {server, port, username, password, register: true}*/
  createPhoneInstance: (options)  => {
    if (options.userAgent) {
        JsSIP.C.USER_AGENT = options.userAgent;
    }

    let socket = new JsSIP.WebSocketInterface(options.proto+'://'+options.server+':'+options.port);
    let configuration = {
      sockets: [ socket ],
      uri: 'sip:' + options.username + '@' + options.server,
      display_name: options.username
    }

    if (options.register) {

      configuration.register = true;

      if (options.password) {
      
        configuration.authorization_user = options.username;
        configuration.password = options.password;

      } 

    } else {

      configuration.register = false;
    
    }

    /* array of custom headers that 
    important for communication */
    if (options.incomingCustomHeaders) {

      incomingCustomHeaders = [... options.incomingCustomHeaders];

    }

    webPhoneUA = new JsSIP.UA(configuration);

    // custom headers for register
    if (options.customHeaders && typeof(options.customHeaders) === 'object') {

      let headers = handleHeaders(options.customHeaders);
    
      console.log('set custom headers as '+options.customHeaders);
      webPhoneUA.registrator().setExtraHeaders(
        headers
      );
    }

    // describe events
    webPhoneUA.on('registered', (e) => { 
      eventSender('phone',{state: 'registered'});
    });
    
    webPhoneUA.on('newMessage', (e) => {

      let options = {};
      let webMessageDirection = setDirection(e.originator);
      if (webMessageDirection === 'outgoing')  {
        options = {
          state: 'message',
          direction: webMessageDirection,
          body: e.request.body
        }
      }

      if (webMessageDirection === 'incoming')  {
        
        let headers= [];
        if (incomingCustomHeaders) {
          let request = e.request
          for (var i in incomingCustomHeaders) {
            if (request.getHeader(incomingCustomHeaders[i])) {
              headers[incomingCustomHeaders[i]] = request.getHeader(incomingCustomHeaders[i]);
            }
          }
        }

        options = {
          state: 'message',
          direction: webMessageDirection,
          headers: headers,
          body: e.request.body
        }
      }

      eventSender('phone',options);
    })


    webPhoneUA.on('newRTCSession', (e) => {  
      
      console.log('new session origiantor: '+e.originator);
        
      if (!webCallSession) {
        // if session is empty - there are no calls. Engine can accept incoming call
        webCallSession = e.session;

        webCallDirection = setDirection(e.originator);

        if (webCallDirection === 'outgoing') {
          let options = {
            state: 'initiated',
            direction : webCallDirection
          }
          eventSender('phone',options);
        }

        webCallSession.on('progress', (event) => {
          console.log("in progress state");
          //let answerHeaders = e.request.headers;
          let options =  {
            state: 'progress',   
            direction : webCallDirection
          }
          if (webCallDirection === 'incoming') options.caller = getFromCallerInfo(e.request.headers);
          eventSender('phone',options);
        });

        webCallSession.on('accepted', (event) => {
          let options =  {
            state: 'accepted',   
            direction : webCallDirection,
          }
          eventSender('phone',options);
        });

        webCallSession.on('failed' , (event) => {
          let options =  {
            state: 'failed',   
            direction : webCallDirection
          }
          eventSender('phone',options);
          webCallSession = null;
        });

        webCallSession.on('ended' , (event) => {
          console.log('succesfully ended');

          let options =  {
            state: 'ended',   
            direction : webCallDirection
          }
          eventSender('phone',options);
          webCallSession = null;
        });

        webCallSession.on('confirmed',  (event) => {
          let options = {
            state: 'confirmed',
            direction : webCallDirection
          }
          eventSender('phone',options);
          webRTCSelfView =   document.getElementById('webRTCSelfView');
          webRTCRemoteView =  document.getElementById('webRTCRemoteView');
          
         // let rtcSession = event.sender;
          
          //let stream = e.stream;
         /* if (webCallSession.connection.getLocalStreams().length > 0) {
             console.log('adding local stream');
             webRTCSelfView.srcObject = webCallSession.connection.getLocalStreams()[0]
          }*/
          if (webCallSession.connection.getRemoteStreams().length > 0) {
            console.log('adding remote stream');
            webRTCRemoteView.srcObject = webCallSession.connection.getRemoteStreams()[0];
          }
        });

        webCallSession.progress;
      }
      else {
        // if session is not empty - there are no calls. Engine can accept incoming call
        let options = {
          status_code:    486,
          reason_phrase: 'Busy Here'
        }
        options = {
          state: 'terminated',
          caller: getFromCallerInfo(e.request.headers),
          direction : 'incoming'
        }
        eventSender('phone',options);
        console.log('set here busy');
      }
        
      if (!webCallSession) {
        let options ={
          state: 'initiated',
          direction : 'outgoing'
        }
        eventSender('phone',options)
        webCallSession = e.session;
      }
      
    });
  
    webPhoneUA.start();
  },

  startCall: (to,options) => {

    //Answer to call;

    /*getUserMedia( (err, stream) => {
      micController = new gainController(stream);
      microphoneStream = micController.outputStream;
    });*/
    let extraHeaders;
    if (options) {
      extraHeaders = handleHeaders(options.customHeaders);
    }

    if (webCallSession) { 
      webCallSession.answer({ /*mediaStream: microphoneStream,*/ mediaConstraints: { audio: false, video: true }})
    }
    else {
      // Start call
      //webRTCSelfView =   document.getElementById('webRTCSelfView');
      webRTCRemoteView =  document.getElementById('webRTCRemoteView');

      console.log(to);
      webCallSession = webPhoneUA.call('sip:' + to + '@' +options.server, {
        //mediaStream: microphoneStream,
        mediaConstraints: {audio: false, video: true},
        pcConfig: {
            rtcpMuxPolicy: 'negotiate',
            iceServers: [
                { urls: 'stun:127.0.0.1:8080?transport=udp' },
                { urls: 'turn:127.0.0.1:8080?transport=udp', 'username': 'test', 'credential': 'test' }
          ]
        },
        extraHeaders: extraHeaders
      });
      webCallSession.connection.addEventListener('addstream', (e) => {
        console.log('attaching remote stream');
        webRTCRemoteView.srcObject = e.stream;
      });
    }
  },

  sendMessage : (rcpt,msg,opts) => {

    let options = {};

    if (opts) {
      options.extraHeaders = handleHeaders(opts.customHeaders);
    }

    if (webPhoneUA) {
      if (msg) {
        webPhoneUA.sendMessage(rcpt,msg,options);
      } 
      else {
        console.log('message body can not be empty');
      }
    }
    else{
      console.log('User Agent not initialized');
    }
  },

  setDigit : (num) => {
    if (webCallSession) {
      let options = {
        duration: 160,
        interToneGap: 1200
      };
      webCallSession.sendDTMF(num, options);
    } else {
      console.log('Session not established');
    }

  },

  // webRTCRemoteView.volume has range form 0 to 1
  mediaControl : (source,action,val) => {
    if (webCallSession) {

        switch (source) {
          case "local":
            if (action === "mute" || action === "unmute") {
              console.log(action);
              webCallSession[action]({audio: false, video: true});
            }
            break;
          default:
            break;

          case "remote" :
            if (action === "mute") {
              webRTCRemoteView.volume = 0;
            }            
            if (action === "unmute") {
              webRTCRemoteView.volume = 1;
            }
            if (action === "changed") {
              webRTCRemoteView.volume = val;
            }
        }
        
    }
  },

  finishCall: () => {
      if (webCallSession) {
        webCallSession.terminate();
      }
  }

}
})()
