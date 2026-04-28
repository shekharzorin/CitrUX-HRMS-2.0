class InternalAgentService:
    def format_response(self, data: dict, intent: str, user_message: str) -> str:
        if intent == "leave_balance":
            balances = data.get("balances", [])
            if not balances:
                return "You do not have any leave balances recorded."
            response = "Here are your current leave balances:\n\n"
            for b in balances:
                response += f"- **{b.get('leave_type', 'Leave')}**: {b.get('balance', 0)} days total ({b.get('used', 0)} used, {b.get('remaining', 0)} remaining)\n"
            return response
            
        elif intent == "who_is_on_leave":
            leaves = data.get("on_leave_today", [])
            if not leaves:
                return "No one is on leave today. All employees are expected to be present."
            response = "The following employees are on leave today:\n\n"
            for l in leaves:
                response += f"- **{l.get('name', 'Unknown')}** ({l.get('leave_type', 'Leave')})\n"
            return response
            
        elif intent == "attendance_status":
            att = data.get("recent_attendance", [])
            if not att:
                return "I couldn't find any recent attendance records for you."
            response = "Here is your recent attendance:\n\n"
            for a in att:
                response += f"- {a.get('date', '')}: {a.get('status', '')} (In: {a.get('checkIn', 'N/A')}, Out: {a.get('checkOut', 'N/A')})\n"
            return response
            
        elif intent == "lowest_attendance":
            low = data.get("lowest_attendance", [])
            if not low:
                return "There is no low attendance data available at the moment."
            response = "Here are the employees with the lowest attendance recently:\n\n"
            for l in low:
                response += f"- **{l.get('name', '')}**: {l.get('days_present', 0)} days present out of {l.get('total_working_days', 0)}\n"
            return response
            
        elif intent == "employee_count":
            count = data.get("total_employees", 0)
            return f"There are currently **{count}** active employees in the company."
            
        elif intent == "get_payslip":
            payslips = data.get("payslips", [])
            if not payslips:
                return "I couldn't find any generated payslips for you."
            response = "Here are your recent payslips:\n\n"
            for p in payslips:
                response += f"- **{p.get('month', '')} {p.get('year', '')}**: Net Salary {p.get('currency', '')} {p.get('net_salary', '')}\n"
            return response
            
        elif intent == "my_profile":
            p = data.get("profile", {})
            if not p:
                return "I couldn't load your profile."
            return f"**Name:** {p.get('firstName', '')} {p.get('lastName', '')}\n**Role:** {p.get('designation', 'N/A')}\n**Department:** {p.get('department', 'N/A')}\n**Email:** {p.get('email', 'N/A')}"
            
        elif intent == "pending_approvals":
            apps = data.get("pending_approvals", [])
            if not apps:
                return "There are no pending approvals right now."
            response = "Here are the pending requests needing approval:\n\n"
            for a in apps:
                response += f"- **{a.get('employee_name', '')}** ({a.get('type', '')}): {a.get('details', '')}\n"
            return response
            
        return "I'm sorry, I don't know how to handle that request yet."

internal_agent = InternalAgentService()
