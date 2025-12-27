
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  detectRuntime,
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.10.2
 * Query Engine version: 5a9203d0590c951969e85a7d07215503f4672eb9
 */
Prisma.prismaVersion = {
  client: "5.10.2",
  engine: "5a9203d0590c951969e85a7d07215503f4672eb9"
}

Prisma.PrismaClientKnownRequestError = () => {
  throw new Error(`PrismaClientKnownRequestError is unable to be run ${runtimeDescription}.
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  throw new Error(`PrismaClientUnknownRequestError is unable to be run ${runtimeDescription}.
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  throw new Error(`PrismaClientRustPanicError is unable to be run ${runtimeDescription}.
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  throw new Error(`PrismaClientInitializationError is unable to be run ${runtimeDescription}.
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  throw new Error(`PrismaClientValidationError is unable to be run ${runtimeDescription}.
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  throw new Error(`NotFoundError is unable to be run ${runtimeDescription}.
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  throw new Error(`sqltag is unable to be run ${runtimeDescription}.
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  throw new Error(`empty is unable to be run ${runtimeDescription}.
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  throw new Error(`join is unable to be run ${runtimeDescription}.
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  throw new Error(`raw is unable to be run ${runtimeDescription}.
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  throw new Error(`Extensions.getExtensionContext is unable to be run ${runtimeDescription}.
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  throw new Error(`Extensions.defineExtension is unable to be run ${runtimeDescription}.
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}

/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  employeeId: 'employeeId',
  email: 'email',
  passwordHash: 'passwordHash',
  status: 'status',
  role: 'role',
  managerId: 'managerId',
  shiftId: 'shiftId'
};

exports.Prisma.SalaryStructureScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  basic: 'basic',
  hra: 'hra',
  da: 'da',
  allowances: 'allowances',
  deductions: 'deductions',
  ctc: 'ctc'
};

exports.Prisma.PayslipScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  month: 'month',
  year: 'year',
  url: 'url',
  gross: 'gross',
  net: 'net',
  details: 'details',
  generatedAt: 'generatedAt'
};

exports.Prisma.ProfileScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  firstName: 'firstName',
  lastName: 'lastName',
  phone: 'phone',
  address: 'address',
  emergencyContact: 'emergencyContact',
  designation: 'designation',
  department: 'department',
  employmentType: 'employmentType',
  dateOfJoining: 'dateOfJoining',
  documents: 'documents',
  profilePhoto: 'profilePhoto',
  profilePhotoSettings: 'profilePhotoSettings'
};

exports.Prisma.AttendanceScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  date: 'date',
  checkIn: 'checkIn',
  checkOut: 'checkOut',
  location: 'location',
  hours: 'hours',
  shiftId: 'shiftId',
  status: 'status',
  isLate: 'isLate'
};

exports.Prisma.ShiftScalarFieldEnum = {
  id: 'id',
  name: 'name',
  startTime: 'startTime',
  endTime: 'endTime',
  graceTime: 'graceTime'
};

exports.Prisma.BreakScalarFieldEnum = {
  id: 'id',
  attendanceId: 'attendanceId',
  startTime: 'startTime',
  endTime: 'endTime',
  duration: 'duration'
};

exports.Prisma.LeaveTypeScalarFieldEnum = {
  id: 'id',
  name: 'name',
  code: 'code',
  daysPerYear: 'daysPerYear',
  carryForward: 'carryForward'
};

exports.Prisma.LeaveBalanceScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  leaveTypeId: 'leaveTypeId',
  balance: 'balance',
  used: 'used'
};

exports.Prisma.LeaveRequestScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  leaveTypeId: 'leaveTypeId',
  startDate: 'startDate',
  endDate: 'endDate',
  days: 'days',
  reason: 'reason',
  status: 'status',
  managerComment: 'managerComment',
  createdAt: 'createdAt'
};

exports.Prisma.HolidayScalarFieldEnum = {
  id: 'id',
  name: 'name',
  date: 'date',
  type: 'type'
};

exports.Prisma.OnboardingScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  status: 'status',
  fullName: 'fullName',
  fatherName: 'fatherName',
  motherName: 'motherName',
  guardianName: 'guardianName',
  dateOfBirth: 'dateOfBirth',
  gender: 'gender',
  maritalStatus: 'maritalStatus',
  bloodGroup: 'bloodGroup',
  nationality: 'nationality',
  profilePhoto: 'profilePhoto',
  profilePhotoSettings: 'profilePhotoSettings',
  personalMobile: 'personalMobile',
  officialMobile: 'officialMobile',
  personalEmail: 'personalEmail',
  officialEmail: 'officialEmail',
  currentAddress: 'currentAddress',
  permanentAddress: 'permanentAddress',
  sameAsCurrentAddress: 'sameAsCurrentAddress',
  department: 'department',
  designation: 'designation',
  employmentType: 'employmentType',
  dateOfJoining: 'dateOfJoining',
  workLocation: 'workLocation',
  reportingManagerId: 'reportingManagerId',
  shift: 'shift',
  workingHours: 'workingHours',
  probationPeriodMonths: 'probationPeriodMonths',
  noticePeriodDays: 'noticePeriodDays',
  totalYearsExperience: 'totalYearsExperience',
  aadhaarNumber: 'aadhaarNumber',
  panNumber: 'panNumber',
  passportNumber: 'passportNumber',
  uanNumber: 'uanNumber',
  esicNumber: 'esicNumber',
  drivingLicense: 'drivingLicense',
  accountHolderName: 'accountHolderName',
  bankName: 'bankName',
  accountNumber: 'accountNumber',
  ifscCode: 'ifscCode',
  branchName: 'branchName',
  salaryPaymentMode: 'salaryPaymentMode',
  medicalConditions: 'medicalConditions',
  allergies: 'allergies',
  disabilityStatus: 'disabilityStatus',
  disabilityDetails: 'disabilityDetails',
  companyEmailCreated: 'companyEmailCreated',
  hrmsAccessEnabled: 'hrmsAccessEnabled',
  roleAndPermissions: 'roleAndPermissions',
  deviceIssued: 'deviceIssued',
  assetId: 'assetId',
  companyPolicyAccepted: 'companyPolicyAccepted',
  ndaAccepted: 'ndaAccepted',
  codeOfConductAccepted: 'codeOfConductAccepted',
  digitalConsentSignature: 'digitalConsentSignature',
  acceptanceTimestamp: 'acceptanceTimestamp',
  acceptanceIp: 'acceptanceIp',
  submittedAt: 'submittedAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OnboardingEmergencyContactScalarFieldEnum = {
  id: 'id',
  onboardingId: 'onboardingId',
  name: 'name',
  relationship: 'relationship',
  mobile: 'mobile',
  alternateMobile: 'alternateMobile'
};

exports.Prisma.OnboardingExperienceScalarFieldEnum = {
  id: 'id',
  onboardingId: 'onboardingId',
  companyName: 'companyName',
  designation: 'designation',
  employmentType: 'employmentType',
  startDate: 'startDate',
  endDate: 'endDate',
  isCurrent: 'isCurrent',
  reasonForLeaving: 'reasonForLeaving'
};

exports.Prisma.OnboardingEducationScalarFieldEnum = {
  id: 'id',
  onboardingId: 'onboardingId',
  institutionName: 'institutionName',
  degreeOrCourse: 'degreeOrCourse',
  highestQualification: 'highestQualification',
  yearOfPassing: 'yearOfPassing'
};

exports.Prisma.OnboardingDocumentScalarFieldEnum = {
  id: 'id',
  onboardingId: 'onboardingId',
  type: 'type',
  url: 'url',
  status: 'status'
};

exports.Prisma.OffboardingScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  reason: 'reason',
  status: 'status',
  lastDay: 'lastDay',
  createdAt: 'createdAt'
};

exports.Prisma.ExitInterviewScalarFieldEnum = {
  id: 'id',
  offboardingId: 'offboardingId',
  feedback: 'feedback',
  rating: 'rating',
  submittedAt: 'submittedAt'
};

exports.Prisma.GoalScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  title: 'title',
  description: 'description',
  deadline: 'deadline',
  status: 'status',
  createdAt: 'createdAt'
};

exports.Prisma.PerformanceReviewScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  reviewerId: 'reviewerId',
  period: 'period',
  rating: 'rating',
  feedback: 'feedback',
  createdAt: 'createdAt'
};

exports.Prisma.JobPostingScalarFieldEnum = {
  id: 'id',
  title: 'title',
  department: 'department',
  description: 'description',
  status: 'status',
  createdAt: 'createdAt'
};

exports.Prisma.JobApplicationScalarFieldEnum = {
  id: 'id',
  jobId: 'jobId',
  applicantName: 'applicantName',
  email: 'email',
  phone: 'phone',
  resumeUrl: 'resumeUrl',
  status: 'status',
  appliedAt: 'appliedAt'
};

exports.Prisma.ExpenseCategoryScalarFieldEnum = {
  id: 'id',
  name: 'name',
  limit: 'limit'
};

exports.Prisma.ExpenseClaimScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  categoryId: 'categoryId',
  amount: 'amount',
  description: 'description',
  status: 'status',
  receiptUrl: 'receiptUrl',
  date: 'date',
  createdAt: 'createdAt'
};

exports.Prisma.CertificateScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  title: 'title',
  verificationId: 'verificationId',
  issuedDate: 'issuedDate',
  url: 'url'
};

exports.Prisma.AssetScalarFieldEnum = {
  id: 'id',
  name: 'name',
  type: 'type',
  serialNumber: 'serialNumber',
  status: 'status',
  assignedTo: 'assignedTo',
  purchasedAt: 'purchasedAt',
  createdAt: 'createdAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  message: 'message',
  read: 'read',
  createdAt: 'createdAt'
};

exports.Prisma.JobRoleScalarFieldEnum = {
  id: 'id',
  title: 'title',
  department: 'department',
  level: 'level',
  description: 'description',
  createdAt: 'createdAt'
};

exports.Prisma.SystemSettingScalarFieldEnum = {
  key: 'key',
  value: 'value'
};

exports.Prisma.TimesheetScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  startDate: 'startDate',
  endDate: 'endDate',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TimesheetEntryScalarFieldEnum = {
  id: 'id',
  timesheetId: 'timesheetId',
  taskId: 'taskId',
  taskName: 'taskName',
  project: 'project',
  mon: 'mon',
  tue: 'tue',
  wed: 'wed',
  thu: 'thu',
  fri: 'fri',
  sat: 'sat',
  sun: 'sun',
  total: 'total'
};

exports.Prisma.TaskScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  project: 'project',
  status: 'status',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  User: 'User',
  SalaryStructure: 'SalaryStructure',
  Payslip: 'Payslip',
  Profile: 'Profile',
  Attendance: 'Attendance',
  Shift: 'Shift',
  Break: 'Break',
  LeaveType: 'LeaveType',
  LeaveBalance: 'LeaveBalance',
  LeaveRequest: 'LeaveRequest',
  Holiday: 'Holiday',
  Onboarding: 'Onboarding',
  OnboardingEmergencyContact: 'OnboardingEmergencyContact',
  OnboardingExperience: 'OnboardingExperience',
  OnboardingEducation: 'OnboardingEducation',
  OnboardingDocument: 'OnboardingDocument',
  Offboarding: 'Offboarding',
  ExitInterview: 'ExitInterview',
  Goal: 'Goal',
  PerformanceReview: 'PerformanceReview',
  JobPosting: 'JobPosting',
  JobApplication: 'JobApplication',
  ExpenseCategory: 'ExpenseCategory',
  ExpenseClaim: 'ExpenseClaim',
  Certificate: 'Certificate',
  Asset: 'Asset',
  Notification: 'Notification',
  JobRole: 'JobRole',
  SystemSetting: 'SystemSetting',
  Timesheet: 'Timesheet',
  TimesheetEntry: 'TimesheetEntry',
  Task: 'Task'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        const runtime = detectRuntime()
        const edgeRuntimeName = {
          'workerd': 'Cloudflare Workers',
          'deno': 'Deno and Deno Deploy',
          'netlify': 'Netlify Edge Functions',
          'edge-light': 'Vercel Edge Functions or Edge Middleware',
        }[runtime]

        let message = 'PrismaClient is unable to run in '
        if (edgeRuntimeName !== undefined) {
          message += edgeRuntimeName + '. As an alternative, try Accelerate: https://pris.ly/d/accelerate.'
        } else {
          message += 'this browser environment, or has been bundled for the browser (running in `' + runtime + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
