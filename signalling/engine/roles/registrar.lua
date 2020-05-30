local config = require "config"

local function registrar()
    -- Handle SIP registrations    
    if KSR.registrar.save(config.locationStorage, 0) < 0 then
        return false
    end
    KSR.log("info","Registration successfull\n")
    return true
end

return registrar