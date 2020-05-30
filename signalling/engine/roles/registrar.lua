local config = require "config"

local function registrar()
    -- Handle SIP registrations    
    if KSR.registrar.save(config.locationStorage, 0) < 0 then
        return false
    end
    return true
end

return registrar