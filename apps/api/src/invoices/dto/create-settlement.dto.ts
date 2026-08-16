import { IsString, IsNumber, IsOptional, IsDateString, IsBoolean } from 'class-validator';

export class CreateSettlementDto {
  @IsString()
  accountId: string;

  @IsNumber()
  amount: number;

  @IsNumber()
  @IsOptional()
  exchangeRate?: number;

  @IsNumber()
  @IsOptional()
  cardChargeAmount?: number;

  @IsDateString()
  @IsOptional()
  paidDate?: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsBoolean()
  @IsOptional()
  isReconciled?: boolean;
}
