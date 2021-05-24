local function closed(reason)

    local ip = KSR.pv.get("$si")
    local port = KSR.pv.get("$sp")
    local conid = KSR.pv.get("$conid")
    KSR.info("Socket closed for: "..ip..":"..port.."\n");

end

return {
    closed = closed,
    reset = closed,
    timeout = closed
}