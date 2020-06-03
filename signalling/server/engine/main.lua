local myPath = debug.getinfo(1).source:match("@?(.*/)")
if not string.match(package.path, myPath) then
    package.path = myPath .. '?.lua;' .. package.path
end

local roles = require "roles.init"
local sockets = require "sockets.init"

function ksr_request_route()
    
    KSR.log("info",KSR.pv.get("$rm").." arrived\n")
    
    local result,err = roles.check.request()
    
    if not result then
        if err then
            KSR.sl.sl_send_reply(err.suggestedCode, err.suggestedReason)
        end
        KSR.x.exit()
    end

    if KSR.is_OPTIONS() and KSR.is_myself_ruri() and KSR.corex.has_ruri_user() < 0 then
        KSR.sl.send_reply(200,"Keepalive")
        KSR.x.exit()
    end

    if KSR.is_CANCEL() then
		if KSR.tm.t_check_trans()>0 then
            roles.relay()
            KSR.x.exit()
		end
    end

    result = roles.withindlg.request()
    
    if  result > 1 then
        
        if result == 2 then
            roles.nathandle.sip()
            roles.relay()
        end

        if KSR.is_ACK() and KSR.tm.t_check_trans() > 0 then
            roles.relay()
        end
        
        -- request with to_tag but does not belongs to any transaction and it is not an ACK
        if result == 3 then
            KSR.sl.send_reply(404,"Not found")
        end
        KSR.x.exit()
    
    end
    KSR.log("info","is initial\n")
    KSR.hdr.remove("Route");
	
	if KSR.is_method_in("IS") then
		KSR.rr.record_route();
	end

    roles.nathandle.sip()
    
    if not roles.auth(KSR.pv.get("$fU"),KSR.pv.get("$si")..":"..KSR.pv.get("$sp")) then
        KSR.sl.sl_send_reply("403","Forbidden")
        KSR.x.exit()
    end

    if KSR.is_REGISTER() then
        if not roles.registrar.save() then
            KSR.sl.sl_send_reply("503","Can't register")
        end

        KSR.x.exit()
    
    end
    
    if not roles.locate.user(KSR.pv.get("$rU")) then
        KSR.sl.sl_send_reply("404","Not found")
        KSR.x.exit()
    end

    roles.relay()

end

function ksr_reply_route()
    roles.nathandle.sip() 
end

-- function branch_route_wrapper()
-- end

-- function onreply_route_wrapper()
-- end

-- function failure_route_wrapper()
-- end

function ksr_xhttp_wrapper()

    if type(roles.http) == "function" then
        roles.http()
    end

end

function ksr_websocket_event_wrapper(evname)
    
    local event = string.match(evname,".*:(.*)")
    sockets.websocket[event]()

end