local config = require "config"

local function auth(username,source) 
    
    if not config.allowedUnames[username] then 
        return false 
    end
    
    KSR.log("info","Auth successfull for "..username.." from "..source.."\n")
    return true
    
end

return auth