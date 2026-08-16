import { PartialType } from '@nestjs/mapped-types';
import { CreateEmployeeDto, CreatePayrollRecordDto } from './create-payroll.dto';

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}
export class UpdatePayrollRecordDto extends PartialType(CreatePayrollRecordDto) {}
