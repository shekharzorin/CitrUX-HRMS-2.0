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

INTENT_HANDLERS = {
    "leave_balance": handle_leave_balance,
    "who_is_on_leave": handle_who_is_on_leave,
    "attendance_status": handle_attendance_status
}
