local json = require "cjson.safe"
local dialog = require "roles.dialog"
local base64 = require "base64"
local config = require "config"


--[[
    [
        { 
            username: a,
            deadline: seconds
        },
        { 
            username: a,
            deadline: seconds
        }
    ]
    ]]
local function create(data) 
    local users = json.decode(data)
    if not users then
        return false,{suggestedCode = 417,suggestedReason = "No users found" }
    end
    if #users == 0 then
        return false,{suggestedCode = 417,suggestedReason = "Users list is empry" }
    end

    local fails = 0 
    for i=1,#users do
        if not users[i].username or not users[i].deadline then
            fails = fails+1
        else
            KSR.pv.seti("$sht(users=>username:"..users[i].username..")",1)
            KSR.pv.seti("$shtex(users=>username:"..users[i].username..")",users[i].deadline )
        end
    end
    if fails == 0 then return true end
    -- if fails > 0 then remove all created users as it is broken
    for i=1,#users do
        if users[i].username then
            KSR.pv.seti("$shtex(users=>username:"..users[i].username..")",1)
        end
    end

    return false,{suggestedCode = 417, suggestedReason = "Expected and passed formats does not match" }

end

local function destroy(data) 
    
    local users = json.decode(data)
    if not users then
        return false,{suggestedCode = 417,suggestedReason = "No users found" }
    end
    if #users == 0 then
        return false,{suggestedCode = 417,suggestedReason = "Users list is empry" }
    end

    for i=1,#users do
        local user = KSR.pv.get("$sht(users=>username:"..users[i].username..")")
        if not user then
            KSR.warn("User "..users[i].username.." wasn't found. Nothing to destroy\n")
        else
            local details = json.decode(base64.decode(user))
            KSR.pv.seti("$shtex(users=>username:"..users[i].username..")",1)
            KSR.pv.seti("$shtex(users=>lookup:"..details[1]..")",1)
            KSR.pv.seti("$shtex(users=>lookup:"..details[2]..")",1)
            dialog.destroy(users[i].username)
        end
    end

    return true

end

local function createUserForTest(username)
    return json.encode({
            {  
                username = username,deadline = KSR.pv.get("$expires(min)") or  KSR.pv.get("$expires(max)")
            }
        }
    )
end

local function handle(username,source) 
    
    if KSR.is_REGISTER() and config.TEST then
        create(createUserForTest(username))
    end

    local user = KSR.pv.get("$sht(users=>username:"..username..")")
    -- because of no user or expired data
    if  not user or string.len(user) == 0 then
        return false,{suggestedCode = 403,suggestedReason = "No such user" }
    end
    
    if not KSR.is_REGISTER() then return true end
        
    local expires = KSR.pv.get("$expires(min)") or  KSR.pv.get("$expires(max)")
    
    if not expires or string.len(expires) == 0 then
        KSR.err("Wrong exipres: destroying "..username.."\n")
        KSR.pv.seti("$shtex(users=>username:"..username..")",1)
        return false,{suggestedCode = 400,suggestedReason = "No expires found" }
    end

    -- Update expires first to not loose data
    KSR.pv.seti("$shtex(users=>username:"..username..")",expires)

    local conid = KSR.pv.get("$conid")
    
    local details = base64.encode(json.encode({conid,source}))

    KSR.pv.sets("$sht(users=>username:"..username..")",details)
    KSR.pv.seti("$shtex(users=>username:"..username..")",expires)

    KSR.pv.sets("$sht(users=>lookup:"..conid..")",username)
    KSR.pv.seti("$shtex(users=>lookup:"..conid..")",expires)
    
    KSR.pv.sets("$sht(users=>lookup:"..source..")",username)
    KSR.pv.seti("$shtex(users=>lookup:"..source..")",expires)

    KSR.log("info","Auth successfull for "..username.." from "..source.."\n")
    return true

end

return {
    handle = handle,
    create = create,
    destroy = destroy
}