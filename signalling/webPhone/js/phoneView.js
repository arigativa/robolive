(function () {
const DEFAULT_SERVER = {
    proto: 'ws',
    host: '127.0.0.1',
    port: 4443
};

const parseServer = str => {
    const fragments = str.split(':');

    if (fragments.length !== 3) {
        return DEFAULT_SERVER;
    }

    return {
        proto: fragments[0],
        host: fragments[1],
        port: fragments[2]
    };
};

const readServerInputValue = () => parseServer($("#server").val());

$("#login").click(() => {
    const server = readServerInputValue()

    phoneEngine.createPhoneInstance({
        proto: server.proto,
        server: server.host,
        port: server.port,
        username: $('#uname').val(),
        register: true,
    });
});

$("#call").click(() => {
    const server = readServerInputValue()
    
    phoneEngine.startCall(
        $('#callee').val(),
        {
            server: server.host
        }
    )
})

$("#answer").click(() => {
    phoneEngine.startCall(null, {})
})

$("#hangup").click(() => {
    phoneEngine.finishCall()
})
})()