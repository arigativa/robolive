local config = require "config"
local auth = require "roles.auth"

local wsport

local function getURL()
    local URL = KSR.pv.get("$hu")
    KSR.info("URL arrived: "..URL.."\n");
    return URL -- parse URL properly
end

local function getWsPort(port) 
    if not port then
        return  KSR.pv.get("$var(WS_PORT)")
    end
    return port
end

local function isWS()
    local upgrade = KSR.hdr.get("Upgrade")
    local connection = KSR.hdr.get("Connection")
    if string.find(upgrade,"websocket") and string.find(connection,"Upgrade") and KSR.is_method_in("G") then
        return true
    end
    return false

end

local function handleWS()
    
    KSR.log("info","HTTP received\n")
    local host = KSR.hdr.get("Host")
    
    if not host or not KSR.is_myself("sip:"..host) then
        KSR.log("L_WARN", "Bad host "..host.."\n")
        KSR.xhttp.xhttp_reply("403", "Forbidden", "", "")
        return false
    end
        
    if not KSR.websocket.handle_handshake() then
        KSR.xhttp.xhttp_reply("404", "Not found", "", "")
        return false
    end

    return true
end

local function http()

    wsport = getWsPort(port) 

    local port = KSR.pv.get("$Rp")
    KSR.log("info","received HTTP request on port: "..port.."\n")

    if port ~= wsport then
        KSR.log("info","Restricted request at port: "..port.."\n")
        KSR.x.exit()
    end

    local url = KSR.pv.get("$hu")
    local contentType = KSR.pv.get("$cT")
   
    if url == "/users/create" then
        local body = KSR.pv.get("$rb")
        local res,err = auth.create(body)
        if not res then
            KSR.err("Can't create users\n")
            if err then
                KSR.xhttp.xhttp_reply(err.suggestedCode, err.suggestedReason,"","")
            end
        else
            KSR.info("Succesfully created\n")
            KSR.xhttp.xhttp_reply("201", "Created", "", "")
        end
        KSR.x.exit()
    end

    if url == "/users/destroy" then
        local body = KSR.pv.get("$rb")
        local res,err = auth.destroy(body)
        if not res then
            KSR.err("Can't destroy users\n")
            if err then
                KSR.xhttp.xhttp_reply(err.suggestedCode, err.suggestedReason,"","")
            end
        else
            KSR.info("Succesfully destoy\n")
            KSR.xhttp.xhttp_reply("201", "Done", "", "")
        end
        KSR.x.exit()
    end

    if isWS() then
        -- if will add API then need to handle return states 
        handleWS() 
        KSR.x.exit()
    end

end

return http