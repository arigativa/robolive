local config = require "config"

local function save()   
    if KSR.registrar.save(config.locationStorage, 0) < 0 then
        return false
    end
    KSR.log("info","Registration successfull\n")
    return true
end

local function remove()
    
end

return {
    save = save,
    remove = remove
}