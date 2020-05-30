local config = require "config"

-- User location service
local function user(username)

    KSR.log("info","Locating user "..username.."\n")
	local rc = KSR.registrar.lookup(config.locationStorage);
    
    if rc < 0 then
        KSR.log("info","Unable to locate "..username.."\n")
        return false
	end
    
    return true
end


return {
    user = user
} 
