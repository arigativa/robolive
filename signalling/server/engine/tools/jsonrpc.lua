local json = require "cjson.safe"

local requestBody = function(prefix, command, params)
    return json.encode({
        jsonrpc = "2.0",
        method = prefix.."."..command,
        params = params
    })
end

local jsonrpcs = {
    requestBody = requestBody
}

return jsonrpcs
