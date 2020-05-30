local function sip()
    
    KSR.force_rport()
	
	if KSR.is_REGISTER() then
        KSR.nathelper.fix_nated_register()
        return
    end
    
    if KSR.siputils.is_first_hop() > 0 then
        KSR.nathelper.fix_nated_contact()
        return
	end
    
end

return {
    sip = sip
}