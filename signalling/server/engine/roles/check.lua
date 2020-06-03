--request returns true,nill in case of all checks passed or false, err = { suggestedCode, suggestedReason }
local function request()
    
    local ua = KSR.pv.get("$ua");
	if string.find(ua, "friendly-scanner") or string.find(ua, "sipcli") then
		return false, { suggestedCode = 200, suggestedReason = "Ok" }
	end

    if KSR.maxfwd.process_maxfwd(10) < 0 then
        return false, { suggestedCode = 483, suggestedReason = "Too Many Hops" }
	end

	if KSR.sanity.sanity_check(1511, 7)<0 then
        KSR.err("Malformed SIP message from ".. KSR.kx.get_srcip() .. ":" .. KSR.kx.get_srcport() .."\n");
        return false
    end

    return true
    
end

return {
    request = request
}