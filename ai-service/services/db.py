import psycopg2
from psycopg2.extras import RealDictCursor
from config.settings import settings
from datetime import datetime

class DBService:
    def __init__(self):
        self.conn_str = settings.DATABASE_URL

    def get_cursor(self):
        conn = psycopg2.connect(self.conn_str)
        return conn, conn.cursor(cursor_factory=RealDictCursor)

    def get_leave_balance(self, user_id: str, company_id: str):
        conn, cur = self.get_cursor()
        try:
            cur.execute("""
                SELECT lt.name, lb.balance, lb.used
                FROM "LeaveBalance" lb
                JOIN "LeaveType" lt ON lb."leaveTypeId" = lt.id
                WHERE lb."userId" = %s AND lb."companyId" = %s
            """, (user_id, company_id))
            return cur.fetchall()
        finally:
            cur.close()
            conn.close()

    def get_today_leaves(self, company_id: str):
        conn, cur = self.get_cursor()
        today = datetime.now().date()
        try:
            cur.execute("""
                SELECT p."firstName", p."lastName", lt.name as leave_type
                FROM "LeaveRequest" lr
                JOIN "User" u ON lr."userId" = u.id
                JOIN "Profile" p ON p."userId" = u.id
                JOIN "LeaveType" lt ON lr."leaveTypeId" = lt.id
                WHERE lr."companyId" = %s 
                AND lr.status = 'APPROVED'
                AND %s BETWEEN lr."startDate" AND lr."endDate"
            """, (company_id, today))
            return cur.fetchall()
        finally:
            cur.close()
            conn.close()

    def get_attendance_summary(self, user_id: str, company_id: str):
        conn, cur = self.get_cursor()
        try:
            cur.execute("""
                SELECT status, "checkIn", "checkOut"
                FROM "Attendance"
                WHERE "userId" = %s AND "companyId" = %s
                ORDER BY date DESC LIMIT 5
            """, (user_id, company_id))
            return cur.fetchall()
        finally:
            cur.close()
            conn.close()

db_service = DBService()
