import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsNumber()
  @IsOptional()
  balance?: number;

  @IsNumber()
  @IsOptional()
  startingBalance?: number;

  @IsOptional()
  startingBalanceDate?: Date;

  @IsNumber()
  @IsOptional()
  cardChargePercent?: number;

  @IsNumber()
  @IsOptional()
  onlineTransferFee?: number;

  @IsBoolean()
  @IsOptional()
  isCardAccount?: boolean;

  @IsBoolean()
  @IsOptional()
  isCardPaymentPriority?: boolean;

  @IsBoolean()
  @IsOptional()
  isLiquid?: boolean;

  @IsBoolean()
  @IsOptional()
  isStarred?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  feeCategoryId?: string;

  @IsString()
  @IsOptional()
  feeSupplierId?: string;
}
