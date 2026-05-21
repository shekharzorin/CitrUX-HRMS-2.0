import { prisma } from '../db';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';


interface PayrollCalculationResult {
    salaryStructure: any;
    attendance: {
        totalDays: number;
        workingDays: number;
        presentDays: number;
        leavesTaken: number;
        absentDays: number;
        lopDays: number;
    };
    earnings: {
        basic: number;
        hra: number;
        allowances: number;
        gross: number;
    };
    deductions: {
        pf: number;
        esi: number;
        professionalTax: number;
        lopAmount: number;
        totalDeductions: number;
    };
    netPay: number;
}

export class PayrollService {
    /**
     * Calculate payroll for a specific user for a given month/year
     */
    static async calculateForUser(userId: string, month: number, year: number): Promise<PayrollCalculationResult> {
        // 1. Fetch Salary Structure
        const salaryStructure = await prisma.salaryStructure.findUnique({
            where: { userId }
        });

        if (!salaryStructure) {
            throw new Error(`Salary structure not found for user ${userId}`);
        }

        // 2. Calculate Days in Month
        const daysInMonth = new Date(year, month, 0).getDate(); // month is 1-indexed? No, JS Date month is 0-indexed for constructor, but for getDate(0) it gets last day of previous month. 
        // Let's assume input month is 1-12.
        const totalDays = new Date(year, month, 0).getDate();

        // 3. Fetch Attendance Stats (Mocked for MVP Logic - Real logic needs granular day checks)
        // For MVP: Count total 'PRESENT' records in Attendance table for this month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const attendanceRecords = await prisma.attendance.findMany({
            where: {
                userId,
                date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        const presentDays = attendanceRecords.filter(a => a.status === 'PRESENT' || a.status === 'HALF_DAY').length; // Simplify

        // Fetch Approved Leaves
        const leaveRequests = await prisma.leaveRequest.findMany({
            where: {
                userId,
                status: 'APPROVED',
                startDate: { lte: endDate },
                endDate: { gte: startDate }
            }
        });

        let approvedLeaveDays = 0;
        leaveRequests.forEach((req: { days: number }) => {
            // Simplified overlap logic
            approvedLeaveDays += req.days; // This is rough, assumes leaves don't span months typically or we accept slightly off calc for MVP
        });

        // Calculate LOP
        // Assumption: Weekends are auto-off. 
        // For MVP, lets assume standard 22 working days logic if detailed data missing, 
        // OR simpler: LOP = TotalDays - (Present + Leaves + Weekends/Holidays)
        // Let's use a simpler "Working Days" constant for MVP or calculate weekends.

        let weekends = 0;
        for (let d = 1; d <= totalDays; d++) {
            const date = new Date(year, month - 1, d);
            const day = date.getDay();
            if (day === 0 || day === 6) weekends++;
        }

        const workingDays = totalDays - weekends;
        // Absent = WorkingDays - (Present + ApprovedLeaves)
        const effectivePresent = presentDays + approvedLeaveDays;
        let lopDays = workingDays - effectivePresent;
        if (lopDays < 0) lopDays = 0; // Prevent negative if data is weird

        // 4. Calculate Earnings (Monthly)
        // SalaryStructure allows defined as Annual (CTC) usually, but schema shows simple floats. 
        // We will assume stored values are MONTHLY for simplicity in this MVP, 
        // OR Divide by 12 if they look large. 
        // Let's assume MONTHLY based on typical 'basic', 'hra' schemas usually storing monthly components.

        const basic = salaryStructure.basic;
        const hra = salaryStructure.hra;
        const allowances = salaryStructure.allowances;
        const gross = basic + hra + allowances;

        // 5. Calculate Deductions
        const pf = salaryStructure.pf;
        const esi = salaryStructure.esi;
        const pt = salaryStructure.professionalTax;

        // LOP Amount
        const perDaySalary = gross / totalDays;
        const lopAmount = perDaySalary * lopDays;

        const totalDeductions = pf + esi + pt + lopAmount;

        // 6. Net Pay
        const netPay = gross - totalDeductions;

        return {
            salaryStructure,
            attendance: {
                totalDays,
                workingDays,
                presentDays,
                leavesTaken: approvedLeaveDays,
                absentDays: 0, // Not explicitly tracked in this logic, effectively contained in LOP
                lopDays
            },
            earnings: {
                basic,
                hra,
                allowances,
                gross
            },
            deductions: {
                pf,
                esi,
                professionalTax: pt,
                lopAmount,
                totalDeductions
            },
            netPay
        };
    }

    /**
     * Generate Payslip Record in DB
     */
    static async generatePayslip(userId: string, month: number, year: number) {
        const calc = await this.calculateForUser(userId, month, year);

        // Check if exists
        const existing = await prisma.payslip.findFirst({
            where: { userId, month, year }
        });

        if (existing) {
            // Update
            return await prisma.payslip.update({
                where: { id: existing.id },
                data: {
                    gross: calc.earnings.gross,
                    net: calc.netPay,
                    totalDays: calc.attendance.totalDays,
                    workingDays: calc.attendance.workingDays,
                    presentDays: calc.attendance.presentDays,
                    lopDays: calc.attendance.lopDays,
                    pfAmount: calc.deductions.pf,
                    esiAmount: calc.deductions.esi,
                    taxAmount: calc.deductions.professionalTax, // Mapping PT to taxAmount
                    details: JSON.stringify(calc),
                    generatedAt: new Date()
                }
            });
        }

        return await prisma.payslip.create({
            data: {
                userId,
                month,
                year,
                gross: calc.earnings.gross,
                net: calc.netPay,
                totalDays: calc.attendance.totalDays,
                workingDays: calc.attendance.workingDays,
                presentDays: calc.attendance.presentDays,
                lopDays: calc.attendance.lopDays,
                pfAmount: calc.deductions.pf,
                esiAmount: calc.deductions.esi,
                taxAmount: calc.deductions.professionalTax,
                details: JSON.stringify(calc),
                status: 'GENERATED'
            }
        });
    }

    /**
     * Generate PDF Stream
     */
    static async generatePdf(payslipId: string): Promise<NodeJS.ReadableStream> {
        const payslip = await prisma.payslip.findUnique({
            where: { id: payslipId },
            include: { user: { include: { profile: true, salary: true } } }
        });

        if (!payslip) throw new Error('Payslip not found');

        const doc = new PDFDocument({ margin: 50 });
        const details = JSON.parse(payslip.details) as PayrollCalculationResult;
        const { user } = payslip;

        // Header
        doc.fontSize(20).text('Citrux HRMS', { align: 'center' });
        doc.fontSize(12).text('Payslip', { align: 'center' });
        doc.moveDown();

        // Employee Info
        doc.fontSize(10);
        doc.text(`Employee Name: ${user.profile?.firstName} ${user.profile?.lastName}`);
        doc.text(`Employee ID: ${user.employeeId || 'N/A'}`);
        doc.text(`Month/Year: ${payslip.month}/${payslip.year}`);
        doc.moveDown();

        // Earnings Table
        doc.text('EARNINGS', { underline: true });
        doc.text(`Basic: ${details.earnings.basic.toFixed(2)}`);
        doc.text(`HRA: ${details.earnings.hra.toFixed(2)}`);
        doc.text(`Allowances: ${details.earnings.allowances.toFixed(2)}`);
        doc.font('Helvetica-Bold').text(`Total Gross: ${details.earnings.gross.toFixed(2)}`);
        doc.font('Helvetica');
        doc.moveDown();

        // Deductions Table
        doc.text('DEDUCTIONS', { underline: true });
        doc.text(`PF: ${details.deductions.pf.toFixed(2)}`);
        doc.text(`ESI: ${details.deductions.esi.toFixed(2)}`);
        doc.text(`PT: ${details.deductions.professionalTax.toFixed(2)}`);
        doc.text(`LOP (${details.attendance.lopDays} days): ${details.deductions.lopAmount.toFixed(2)}`);
        doc.font('Helvetica-Bold').text(`Total Deductions: ${details.deductions.totalDeductions.toFixed(2)}`);
        doc.font('Helvetica');
        doc.moveDown();

        // Net Pay
        doc.fontSize(14).font('Helvetica-Bold').text(`NET PAY: ${details.netPay.toFixed(2)}`, { align: 'right' });

        doc.end();
        return doc;
    }
}
