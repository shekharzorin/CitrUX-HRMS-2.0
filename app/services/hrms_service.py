from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import User, Attendance, Leave, Task, Holiday, Team, TeamMember
from datetime import datetime, date, timedelta

def get_user_hours(db: Session, user_id: int, date_range=None):
    query = db.query(func.sum(Attendance.hours)).filter(Attendance.user_id == user_id)
    
    if date_range:
        start_date, end_date = date_range
        query = query.filter(Attendance.date >= start_date, Attendance.date <= end_date)
    else:
        # Default to this week
        today = date.today()
        start_of_week = today - timedelta(days=today.weekday())
        query = query.filter(Attendance.date >= start_of_week)
    
    total_hours = query.scalar() or 0
    return f"You worked {total_hours} hours in the specified period."

def get_leave_balance(db: Session, user_id: int):
    # Mock logic for balance, or count approved leaves
    approved_leaves = db.query(Leave).filter(Leave.user_id == user_id, Leave.status == "approved").count()
    # Assuming a total of 20 leaves per year
    balance = 20 - approved_leaves
    return f"You have {balance} leave days remaining."

def get_team_on_leave(db: Session, manager_id: int):
    # Find team members
    team = db.query(Team).filter(Team.manager_id == manager_id).first()
    if not team:
        return "You don't seem to be managing any team."
    
    member_ids = db.query(TeamMember.user_id).filter(TeamMember.team_id == team.id).all()
    member_ids = [m[0] for m in member_ids]
    
    today = date.today()
    leaves_today = db.query(User.name).join(Leave).filter(
        Leave.user_id.in_(member_ids),
        Leave.start_date <= today,
        Leave.end_date >= today,
        Leave.status == "approved"
    ).all()
    
    if not leaves_today:
        return "No one from your team is on leave today."
    
    names = ", ".join([name[0] for name in leaves_today])
    return f"{len(leaves_today)} team members are on leave today: {names}."

def get_pending_tasks(db: Session, user_id: int):
    tasks = db.query(Task).filter(Task.user_id == user_id, Task.status == "pending").all()
    if not tasks:
        return "You have no pending tasks."
    return f"You have {len(tasks)} pending tasks."

def get_next_holiday(db: Session):
    today = date.today()
    next_holiday = db.query(Holiday).filter(Holiday.date >= today).order_by(Holiday.date).first()
    
    if not next_holiday:
        return "There are no upcoming holidays scheduled."
    
    if next_holiday.date == today:
        return f"Today is a holiday: {next_holiday.name}!"
    
    days_left = (next_holiday.date - today).days
    return f"The next holiday is {next_holiday.name} on {next_holiday.date} (in {days_left} days)."

def get_who_didnt_log_in(db: Session, manager_id: int):
    team = db.query(Team).filter(Team.manager_id == manager_id).first()
    if not team:
        return "Access denied or team not found."
    
    member_ids = db.query(TeamMember.user_id).filter(TeamMember.team_id == team.id).all()
    member_ids = [m[0] for m in member_ids]
    
    today = date.today()
    logged_in_ids = db.query(Attendance.user_id).filter(
        Attendance.user_id.in_(member_ids),
        Attendance.date == today
    ).all()
    logged_in_ids = [l[0] for l in logged_in_ids]
    
    not_logged_in = db.query(User.name).filter(
        User.id.in_(member_ids),
        ~User.id.in_(logged_in_ids)
    ).all()
    
    if not not_logged_in:
        return "Everyone in your team has logged in today."
    
    names = ", ".join([name[0] for name in not_logged_in])
    return f"{len(not_logged_in)} members didn't log in today: {names}."
