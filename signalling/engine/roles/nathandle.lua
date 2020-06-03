local function sip()
    
    KSR.force_rport()
	
	if KSR.is_REGISTER() then
        KSR.nathelper.fix_nated_register()
        return
    end
    
    if KSR.siputils.is_first_hop() > 0 then
        KSR.nathelper.fix_nated_contact()
        KSR.nathelper.add_rcv_param(";transport="..KSR.pv.get("$pr"))
        return
	end
    
end

return {
    sip = sip
}