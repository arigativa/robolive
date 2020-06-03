local function closed()

    local ip = KSR.pv.get("$si")
    local port = KSR.pv.get("$sp")
    KSR.info("Socket closed for: "..ip..":"..port.."\n");


end

return {
    closed = closed
}