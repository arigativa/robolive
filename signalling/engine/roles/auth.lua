local config = require "config"

local function auth() 
        
    local uname = KSR.hdr.get("$fU")
    if not config.allowedUnames[uname] then return false end
    
end

return auth