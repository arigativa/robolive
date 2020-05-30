local function relay()
	-- enable additional event routes for forwarded requests
	-- - serial forking, RTP relaying handling, a.s.o.
	if KSR.is_method_in("IBSU") then
		if KSR.tm.t_is_set(branch)<0 then
			KSR.tm.t_on_branch("ksr_branch_route_wrapper")
        end
    end
    
	if KSR.is_method_in("ISU") then
		if KSR.tm.t_is_set(onreply)<0 then
			KSR.tm.t_on_reply("ksr_onreply_route_wrapper")
        end
	end

	if KSR.is_INVITE() then
		if KSR.tm.t_is_set(failure)<0 then
			KSR.tm.t_on_failure("ksr_failure_route_wrapper")
		end
	end

	if KSR.tm.t_relay()<0 then
		KSR.sl.sl_reply_error()
    end
    return true
end

return relay