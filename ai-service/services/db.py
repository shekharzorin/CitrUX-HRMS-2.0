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

    def get_leave_balance(self, user_id: str, company_id: str = None):
        conn, cur = self.get_cursor()
        try:
            cur.execute("""
                SELECT lt.name, lb.balance, lb.used
                FROM "LeaveBalance" lb
                JOIN "LeaveType" lt ON lb."leaveTypeId" = lt.id
                WHERE lb."userId" = %s AND (%s IS NULL OR lb."companyId" = %s)
            """, (user_id, company_id, company_id))
            return cur.fetchall()
        finally:
            cur.close()
            conn.close()

    def get_today_leaves(self, company_id: str = None):
        conn, cur = self.get_cursor()
        today = datetime.now().date()
        try:
            cur.execute("""
                SELECT p."firstName", p."lastName", lt.name as leave_type
                FROM "LeaveRequest" lr
                JOIN "User" u ON lr."userId" = u.id
                JOIN "Profile" p ON p."userId" = u.id
                JOIN "LeaveType" lt ON lr."leaveTypeId" = lt.id
                WHERE (%s IS NULL OR lr."companyId" = %s)
                AND lr.status = 'APPROVED'
                AND %s BETWEEN lr."startDate" AND lr."endDate"
            """, (company_id, company_id, today))
            return cur.fetchall()
        finally:
            cur.close()
            conn.close()

    def get_attendance_summary(self, user_id: str, company_id: str = None):
        conn, cur = self.get_cursor()
        try:
            cur.execute("""
                SELECT status, "checkIn", "checkOut"
                FROM "Attendance"
                WHERE "userId" = %s AND (%s IS NULL OR "companyId" = %s)
                ORDER BY date DESC LIMIT 5
            """, (user_id, company_id, company_id))
            return cur.fetchall()
        finally:
            cur.close()
            conn.close()

    def get_lowest_attendance(self, company_id: str = None):
        conn, cur = self.get_cursor()
        try:
            cur.execute("""
                SELECT p."firstName", p."lastName", COUNT(a.id) as present_count
                FROM "User" u
                JOIN "Profile" p ON p."userId" = u.id
                LEFT JOIN "Attendance" a ON a."userId" = u.id AND a.status = 'PRESENT'
                WHERE (%s IS NULL OR u."companyId" = %s)
                GROUP BY u.id, p."firstName", p."lastName"
                ORDER BY present_count ASC LIMIT 5
            """, (company_id, company_id))
            return cur.fetchall()
        finally:
            cur.close()
            conn.close()

    def get_employee_count(self, company_id: str = None):
        conn, cur = self.get_cursor()
        try:
            if company_id:
                cur.execute("SELECT COUNT(*) FROM \"User\" WHERE \"companyId\" = %s", (company_id,))
            else:
                cur.execute("SELECT COUNT(*) FROM \"User\"")
            return cur.fetchone()
        finally:
            cur.close()
            conn.close()

    def get_payslips(self, user_id: str):
        conn, cur = self.get_cursor()
        try:
            cur.execute("""
                SELECT month, year, net, url
                FROM "Payslip"
                WHERE "userId" = %s
                ORDER BY year DESC, month DESC LIMIT 3
            """, (user_id,))
            return cur.fetchall()
        finally:
            cur.close()
            conn.close()

    def get_user_profile(self, user_id: str):
        conn, cur = self.get_cursor()
        try:
            cur.execute("""
                SELECT p."firstName", p."lastName", p.designation, p.department, p."dateOfJoining", u.email
                FROM "User" u
                JOIN "Profile" p ON p."userId" = u.id
                WHERE u.id = %s
            """, (user_id,))
            return cur.fetchone()
        finally:
            cur.close()
            conn.close()

    def get_pending_approvals(self, company_id: str = None):
        conn, cur = self.get_cursor()
        try:
            # Check for pending leaves
            cur.execute("SELECT COUNT(*) FROM \"LeaveRequest\" WHERE (%s IS NULL OR \"companyId\" = %s) AND status = 'PENDING'", (company_id, company_id))
            leaves_res = cur.fetchone()
            leaves = leaves_res['count'] if leaves_res else 0
            
            # Check for pending expenses
            cur.execute("SELECT COUNT(*) FROM \"ExpenseClaim\" WHERE status = 'PENDING'")
            expenses_res = cur.fetchone()
            expenses = expenses_res['count'] if expenses_res else 0
            
            return {"pending_leaves": leaves, "pending_expenses": expenses}
        finally:
            cur.close()
            conn.close()

db_service = DBService()
