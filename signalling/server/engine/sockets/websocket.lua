local dialogs = require("roles.dialogs")

local function closed()

    local ip = KSR.pv.get("$si")
    local port = KSR.pv.get("$sp")
    local conid = KSR.pv.get("$conid")
    KSR.info("Socket closed for: "..ip..":"..port.."\n");
    local user = KSR.pv.get("$sht(users=>lookup:"..conid..")")
    if user then
        dialogs.destroy(user)
    end
end

return {
    closed = closed
}