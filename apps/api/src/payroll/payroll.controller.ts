import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Req } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { CreateEmployeeDto, CreatePayrollRecordDto } from './dto/create-payroll.dto';
import { UpdateEmployeeDto, UpdatePayrollRecordDto } from './dto/update-payroll.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER) // Only owners and managers handle payroll
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('employees')
  createEmployee(@Req() req, @Body() dto: CreateEmployeeDto) {
    return this.payrollService.createEmployee(req.user.userId, dto);
  }

  @Get('employees')
  getEmployees() {
    return this.payrollService.getEmployees();
  }

  @Put('employees/:id')
  updateEmployee(@Req() req, @Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.payrollService.updateEmployee(req.user.userId, id, dto);
  }

  @Delete('employees/:id')
  deleteEmployee(@Req() req, @Param('id') id: string) {
    return this.payrollService.softDeleteEmployee(req.user.userId, id);
  }

  @Post('records')
  createRecord(@Req() req, @Body() dto: CreatePayrollRecordDto) {
    return this.payrollService.createPayrollRecord(req.user.userId, dto);
  }

  @Get('records')
  getRecords() {
    return this.payrollService.getPayrollRecords();
  }

  @Put('records/:id')
  updateRecord(@Req() req, @Param('id') id: string, @Body() dto: UpdatePayrollRecordDto) {
    return this.payrollService.updatePayrollRecord(req.user.userId, id, dto);
  }

  @Delete('records/:id')
  deleteRecord(@Req() req, @Param('id') id: string) {
    return this.payrollService.softDeletePayrollRecord(req.user.userId, id);
  }
}
