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

return {
    sip = sip
}