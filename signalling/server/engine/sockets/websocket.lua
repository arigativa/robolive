local dialog = require("roles.dialog")

local function closed()

    local ip = KSR.pv.get("$si")
    local port = KSR.pv.get("$sp")
    local conid = KSR.pv.get("$ws_conid")
    KSR.info("Socket closed for: "..ip..":"..port.."\n");
    
    local user = KSR.pv.get("$sht(users=>lookup:"..conid..")")
    KSR.info("weboscket destroyed for user: "..tostring(user).."\n")
    if user then
        dialog.destroy(user)
    end
end

return {
    closed = closed
}