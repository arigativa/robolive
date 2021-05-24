local json = require "cjson.safe"
local base64 = require "base64"
local jsonrpc = require "tools.jsonrpc"

local function create(fuser,tuser,callid,ftag,ttag)
    local id = base64.encode(json.encode({callid,ftag,ttag}))
    KSR.pv.sets("$sht(dialogs=>username:"..fuser..")",id)
    KSR.pv.sets("$sht(dialogs=>username:"..tuser..")",id)

end

local function destroy(user) 
    
    local u = KSR.pv.get("$sht(dialogs=>username:"..user..")")

    if not u then
        KSR.warn("Can't find dialog for with the user "..user.." for removing\n")
        return false
    end

    KSR.pv.seti("$shtex(dialogs=>username:"..user..")",1)
    
    local uDecoded = json.decode(base64.decode(u))

    KSR.info("Destroying dialog for "..json.encode(uDecoded).."\n")
    KSR.jsonrpcs.exec(jsonrpc.requestBody("dlg","terminate_dlg",uDecoded))

    return true

end

return {
    create = create,
    destroy = destroy
}
