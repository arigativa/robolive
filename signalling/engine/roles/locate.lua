local config = require "config"

-- User location service
local function user(username)

    KSR.log("info","Locating user "..username.."\n")
	local rc = KSR.registrar.lookup(config.locationStorage);
    
    if rc < 0 then
        KSR.log("info","Unable to locate "..username.."\n")
        return false
	end
    KSR.info("user "..username.." found\n")
    return true
end


return {
    user = user
} 
