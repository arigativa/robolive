local json = require "cjson.safe"


-- local function parseHeader(value) 
--     local uname,host,port,urlParams,headerParams=string.match(value,"<sip:(.*)@([%a%d%.]+):*(%d*)([;?[%a%d-=:]*]*)>?([;?[%a%d-=:]*]*)")
--     return {
--         uname = uname,
--         host = host,
--         urlParams = urlParams,
--         headerParams = headerParams
--     }
-- end

local IPAddrTemplate = "(%d+.%d+.%d+.%d)"
local FalseIPAddrs = {
    "127.0.0.1",
    "0.0.0.0"
}

local candidateTemplates = {
    localCandidate = "a=candidate:.+%.local"
}

local function removeLocalCandidates(line)
    --a=candidate:394479891 1 udp 2113937151 bf7c335a-42fe-4e07-97c3-7403986c8f8a.local 45275 typ host generation 0 network-cost 999
    -- remove all local candidates
    local candidateLocal = string.match(line,candidateTemplates.localCandidate)
    if not candidateLocal then
        return line
    end
    KSR.info("Found local candindate: "..candidateLocal.."\n")
    return nil
end

local function handleSDP(body) 
    local newBody = ""
    for line in string.gmatch(body,"([^\r\n]*)[\r\n]") do
        if string.len(line) > 0 then 
            handledLine = removeLocalCandidates(line)
            if handledLine then
                newBody = newBody..handledLine.."\n"
            end
        end
    end
    return newBody

end

local function sip()
    
    KSR.force_rport()
	
	if KSR.is_REGISTER() then
        KSR.nathelper.fix_nated_register()
        return
    end
    
    if KSR.siputils.is_first_hop() > 0 then
        if KSR.siputils.is_request() > 0 then
            KSR.nathelper.handle_ruri_alias()
        end
        if KSR.hdr.is_present("Contact") > 0 then
            KSR.nathelper.add_contact_alias()
        end
        return
    end
    
end

local function sdp() 
    local body = KSR.pv.get("$rb")
    if string.len(body) == 0 then return end
    local newBody = handleSDP(body)
    KSR.textops.set_body(newBody,"application/sdp")
end

return {
    sip = sip,
    sdp = sdp
}