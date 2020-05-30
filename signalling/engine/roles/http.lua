local function isWS()
    if KSR.hdr.get("Upgrade")=~"websocket" and KSR.hdr.get("Connection")=~"Upgrade" and KSR.is_method_in("G") then
        return true
    end
    return false

end

local function handleWS()
    local host = KSR.hdr.get("Host")
    if not host || not KSR.is_myself("sip:"..host) end
        KSR.xlog("L_WARN", "Bad host "..host.."\n")
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

   if isWS() then
        -- if will add API then need to handle retur states 
        handleWS() 
        KSR.x.exit()
    end

end

return http