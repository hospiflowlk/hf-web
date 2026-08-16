import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateEmployeeDto, CreatePayrollRecordDto } from './dto/create-payroll.dto';
import { UpdateEmployeeDto, UpdatePayrollRecordDto } from './dto/update-payroll.dto';

@Injectable()
export class PayrollService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async createEmployee(userId: string, dto: CreateEmployeeDto) {
    const employee = await this.prisma.employee.create({ data: dto });
    await this.audit.logAction(userId, 'CREATE', 'Employee', employee.id, null, employee);
    return employee;
  }

  async getEmployees() {
    return this.prisma.employee.findMany({ where: { isDeleted: false } });
  }

  async updateEmployee(userId: string, id: string, dto: UpdateEmployeeDto) {
    const oldEmp = await this.prisma.employee.findUnique({ where: { id } });
    if (!oldEmp || oldEmp.isDeleted) throw new NotFoundException('Employee not found');
    const newEmp = await this.prisma.employee.update({ where: { id }, data: dto });
    await this.audit.logAction(userId, 'UPDATE', 'Employee', id, oldEmp, newEmp);
    return newEmp;
  }

  async softDeleteEmployee(userId: string, id: string) {
    const oldEmp = await this.prisma.employee.findUnique({ where: { id } });
    if (!oldEmp) throw new NotFoundException('Employee not found');
    const newEmp = await this.prisma.employee.update({ where: { id }, data: { isDeleted: true } });
    await this.audit.logAction(userId, 'SOFT_DELETE', 'Employee', id, oldEmp, newEmp);
    return newEmp;
  }

  async createPayrollRecord(userId: string, dto: CreatePayrollRecordDto) {
    const record = await this.prisma.payrollRecord.create({ data: dto });
    await this.audit.logAction(userId, 'CREATE', 'PayrollRecord', record.id, null, record);
    return record;
  }

  async getPayrollRecords() {
    return this.prisma.payrollRecord.findMany({ where: { isDeleted: false }, include: { employee: true } });
  }

  async updatePayrollRecord(userId: string, id: string, dto: UpdatePayrollRecordDto) {
    const oldRec = await this.prisma.payrollRecord.findUnique({ where: { id } });
    if (!oldRec || oldRec.isDeleted) throw new NotFoundException('PayrollRecord not found');
    const newRec = await this.prisma.payrollRecord.update({ where: { id }, data: dto });
    await this.audit.logAction(userId, 'UPDATE', 'PayrollRecord', id, oldRec, newRec);
    return newRec;
  }

  async softDeletePayrollRecord(userId: string, id: string) {
    const oldRec = await this.prisma.payrollRecord.findUnique({ where: { id } });
    if (!oldRec) throw new NotFoundException('PayrollRecord not found');
    const newRec = await this.prisma.payrollRecord.update({ where: { id }, data: { isDeleted: true } });
    await this.audit.logAction(userId, 'SOFT_DELETE', 'PayrollRecord', id, oldRec, newRec);
    return newRec;
  }
}
