import { IsDateString, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  position: string;

  @IsNumber()
  @IsNotEmpty()
  baseSalary: number;

  @IsDateString()
  @IsNotEmpty()
  joinDate: string;
}

export class CreatePayrollRecordDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsDateString()
  @IsNotEmpty()
  month: string;

  @IsNumber()
  @IsNotEmpty()
  salary: number;

  @IsNumber()
  deductions: number;

  @IsNumber()
  bonuses: number;

  @IsNumber()
  netPay: number;
}
