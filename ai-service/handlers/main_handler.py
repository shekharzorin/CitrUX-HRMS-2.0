from services.db import db_service

def handle_leave_balance(user_id, company_id, entities):
    balances = db_service.get_leave_balance(user_id, company_id)
    return {"balances": balances}

def handle_who_is_on_leave(user_id, company_id, entities):
    leaves = db_service.get_today_leaves(company_id)
    return {"on_leave_today": leaves}

def handle_attendance_status(user_id, company_id, entities):
    attendance = db_service.get_attendance_summary(user_id, company_id)
    return {"recent_attendance": attendance}

def handle_lowest_attendance(user_id, company_id, entities):
    data = db_service.get_lowest_attendance(company_id)
    return {"lowest_attendance": data}

def handle_employee_count(user_id, company_id, entities):
    count = db_service.get_employee_count(company_id)
    return {"total_employees": count}

def handle_get_payslip(user_id, company_id, entities):
    payslips = db_service.get_payslips(user_id)
    return {"payslips": payslips}

def handle_my_profile(user_id, company_id, entities):
    profile = db_service.get_user_profile(user_id)
    return {"profile": profile}

def handle_pending_approvals(user_id, company_id, entities):
    approvals = db_service.get_pending_approvals(company_id)
    return {"pending_approvals": approvals}

INTENT_HANDLERS = {
    "leave_balance": handle_leave_balance,
    "who_is_on_leave": handle_who_is_on_leave,
    "attendance_status": handle_attendance_status,
    "lowest_attendance": handle_lowest_attendance,
    "employee_count": handle_employee_count,
    "get_payslip": handle_get_payslip,
    "my_profile": handle_my_profile,
    "pending_approvals": handle_pending_approvals
}
