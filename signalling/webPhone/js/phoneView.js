let proto    = 'ws'
let addr 	 = '127.0.0.1'
let port 	 = 4443
let state 	 = 'notcalling'

let timer, callStartTime, callDuration

let viewHandleHeaders = (headers) => {
	if (headers['X-role']) {

    }

	if (headers['X-room']) {

	}
}

let eventHandler = (e) => {
	let event = e.originalEvent
	//console.log(e.originalEvent);
	if (event.detail.direction) {
		switch(event.detail.direction) {
			case 'incoming':
				
				switch (event.detail.state) {
					case 'message':
						viewHandleHeaders(event.detail.headers)
						if (event.detail.body) {
							showBody(event.detail.body)
						} 
						break;
					default:
						break;
				}
				break;

			case 'outgoing' :
				switch (event.detail.state) {
					case 'message':
						if (event.detail.body) {
							showBody(event.detail.body)
						}
						break;
					default:
						break;
				}
				break;

			default:
				break;
		}			
	} 
};



$("#login").click( () => {

    let username = $('#uname').val()
    let serverData = $("#server").val()
    
    if (serverData) {
        serverData = serverData.split(":")
        proto   = serverData[0]
        addr    = serverData[1]
        port    = serverData[2]
    }
    console.log(proto,addr,port)
    if ( !proto || !addr || !port ) {
        console.error("Server description does not match to pattern: proto:addr:port. Unable to connect...")
        return
    }

	phoneEngine.createPhoneInstance({
        proto: proto, 
		server: addr, 
		port: port, 
		username: username,
		register: true,
    })
    
})

$("#call").click( () => {
        let callee = $('#callee').val()
	    phoneEngine.startCall(callee,{})
})

$("#answer").click( () => {
    phoneEngine.startCall(null,{})
})

$("#hangup").click( () => {
	phoneEngine.finishCall()
})