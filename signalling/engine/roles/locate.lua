local config = require "config"

-- User location service
local function user()
	local rc = KSR.registrar.lookup(locationStorage);
    
    if rc < 0 then
        return false
	end
    
    return true
end


return {
    user = user
} 
