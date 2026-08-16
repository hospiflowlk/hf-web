import { IsNotEmpty, MinLength, IsString } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'PIN is required' })
  @MinLength(4, { message: 'PIN must be at least 4 characters long' })
  pin: string;
}
