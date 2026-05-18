class InternalAgentService:
    def format_response(self, data: dict, intent: str, user_message: str) -> str:
        if intent == "leave_balance":
            balances = data.get("balances", [])
            if not balances:
                return "You do not have any leave balances recorded in the system."
            response = "📊 **Your Current Leave Balances:**\n\n"
            for b in balances:
                response += f"• **{b.get('leave_type', 'Leave')}**: {b.get('balance', 0)} days total ({b.get('used', 0)} used, **{b.get('remaining', 0)} remaining**)\n"
            return response
            
        elif intent == "who_is_on_leave":
            leaves = data.get("on_leave_today", [])
            if not leaves:
                return "🎉 **No one is on approved leave today.** All employees are expected to be present."
            response = f"👥 **Employees on leave today ({len(leaves)}):**\n\n"
            for l in leaves:
                name = f"{l.get('firstName', '')} {l.get('lastName', '')}".strip() or "Employee"
                response += f"• **{name}** — {l.get('leave_type', 'Leave')} (until {l.get('endDate', 'N/A')})\n"
            return response
            
        elif intent == "attendance_status":
            att = data.get("recent_attendance", [])
            if not att:
                return "I couldn't find any recent attendance records for you. Have you clocked in yet?"
            response = "📍 **Your Recent Attendance (Last 5 Days):**\n\n"
            for a in att:
                date_str = a.get('date', '')[:10] if a.get('date') else 'Recent'
                in_time = a.get('checkIn', '')[11:16] if a.get('checkIn') else 'N/A'
                out_time = a.get('checkOut', '')[11:16] if a.get('checkOut') else 'Still working'
                hours = f"{float(a.get('hours', 0)):.1f} hrs" if a.get('hours') is not None else 'In progress'
                response += f"• **{date_str}**: {a.get('status', 'PRESENT')} | In: {in_time} | Out: {out_time} ({hours})\n"
            return response
            
        elif intent == "lowest_attendance":
            low = data.get("lowest_attendance", [])
            if not low:
                return "There is no low attendance data available at the moment."
            response = "⚠️ **Attendance Alert — Lowest Attendance Records:**\n\n"
            for l in low:
                name = f"{l.get('firstName', '')} {l.get('lastName', '')}".strip() or "Employee"
                response += f"• **{name}**: {l.get('present_count', 0)} days present\n"
            return response
            
        elif intent == "employee_count":
            total_obj = data.get("total_employees", {})
            count = total_obj.get("count", 0) if isinstance(total_obj, dict) else total_obj
            return f"🏢 There are currently **{count} active employees** registered in the organization."
            
        elif intent == "get_payslip":
            payslips = data.get("payslips", [])
            if not payslips:
                return "I couldn't find any generated payslips for your account. Please contact HR."
            response = "💰 **Your Recent Payslips:**\n\n"
            for p in payslips:
                net = f"₹{p.get('net_salary', 0):,}" if p.get('net_salary') is not None else 'N/A'
                gross = f"₹{p.get('gross_salary', 0):,}" if p.get('gross_salary') is not None else 'N/A'
                response += f"• **{p.get('month', '')}/{p.get('year', '')}**: Net Pay **{net}** (Gross: {gross}) | Status: {p.get('status', 'PAID')}\n"
            return response
            
        elif intent == "my_profile":
            p = data.get("profile", {})
            if not p:
                return "I couldn't load your profile information."
            name = f"{p.get('firstName', '')} {p.get('lastName', '')}".strip()
            return f"👤 **Your Profile Information:**\n\n• **Name:** {name}\n• **Designation:** {p.get('designation', 'N/A')}\n• **Department:** {p.get('department', 'N/A')}\n• **Email:** {p.get('email', 'N/A')}\n• **Joining Date:** {str(p.get('dateOfJoining', ''))[:10]}"
            
        elif intent == "pending_approvals":
            apps = data.get("pending_approvals", {})
            leaves = apps.get("pending_leaves", 0) if isinstance(apps, dict) else 0
            expenses = apps.get("pending_expenses", 0) if isinstance(apps, dict) else 0
            total = leaves + expenses
            
            if total == 0:
                return "✅ **All caught up!** There are no pending requests requiring approval right now."
                
            return f"📋 **Pending Approvals Summary ({total} Total):**\n\n• **Leave Requests:** {leaves} pending\n• **Expense Claims:** {expenses} pending\n\nCheck your Approvals dashboard to take action."
            
        return "I'm sorry, I don't know how to handle that request yet. I can help with leaves, attendance, profile info, employee count, payslips, and approvals!"

internal_agent = InternalAgentService()
