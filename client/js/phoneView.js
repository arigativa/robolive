
let server 	 = '195.248.90.85';
let port 	 = 7000;
//let username = 'test1';
//let password = 'test1';
let state 	 = 'notcalling';
let token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7ImlkIjoxLCJlbWFpbCI6ImFkbWluQGFzZXJnaXMuY29tIiwidXVpZCI6IjM0MzQ0NDQifSwiaWF0IjoxNTIwNDI4NDQzLCJleHAiOjE1MjMwMjA0NDN9.WcoikKcNc_bt8iJmWSe5vNZvm_MvfRQBz39OOQERYyA";

let timer, callStartTime, callDuration;

let room;

let viewHandleHeaders = (headers) => {
	if (headers['X-role'])

	if (headers['X-room']) {

	}
}

let eventHandler = (e) => {
	let event = e.originalEvent;
	//console.log(e.originalEvent);
	if (event.detail.direction) {
		switch(event.detail.direction) {
			case 'incoming':
				
				switch (event.detail.state) {
					case 'message':
						viewHandleHeaders(event.detail.headers);
						if (event.detail.body) {
							showBody(event.detail.body);
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
							showBody(event.detail.body);
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



/*$("#login").click( () => {
	customToken = $("#token").val();
	if (!customToken) {
		customToken = token
	}
	let headers = {
		'X-Token': customToken
	}


	console.log(jwt_decode(token));

	let username = $('#uname').val();
*/

	
	phoneEngine.createPhoneInstance({
		server: server, 
		port: port, 
		username: 'test',
		register: true,
		customHeaders: {
			'X-Token': token
		}
	});
//});

$("#call").click( () => {
	
	//console.log(jwt_decode(token));

	

	phoneEngine.startCall('28',{ 
		customHeaders: {
			'X-Token': token,
			'X-ASERGIS-appname':'AC'
		}
	});
});

$("#sendPin").click( () => {
	let pin = $("#pin").val();
	
	let arr = pin.split('');
	arr.forEach((elem)=>{
		phoneEngine.setDigit(elem);
	});
});

$("#hangup").click( () => {
	phoneEngine.finishCall();
});