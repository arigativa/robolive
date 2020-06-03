local function request()
    if KSR.siputils.has_totag() < 0 then return 1 end
	if KSR.rr.loose_route() > 0 then
		return 2
	end
    return 3
end

return {
    request = request
}