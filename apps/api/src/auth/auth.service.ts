import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

  async validateUser(name: string, pin: string): Promise<any> {
    const user = await this.usersService.findByName(name);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is deactivated');
    }

    const isMatch = await bcrypt.compare(pin, (user as any).pinHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { pinHash, ...result } = user as any;
    return result;
  }

  async login(user: any) {
    const payload = { name: user.name, sub: user.id, role: user.role };
    
    const access_token = this.jwtService.sign(payload, {
      expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as any
    });
    
    const refresh_token = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key-123',
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any
    });

    // Hash refresh token before saving
    const salt = await bcrypt.genSalt(10);
    const hashedRefreshToken = await bcrypt.hash(refresh_token, salt);
    await this.usersService.updateRefreshToken(user.id, hashedRefreshToken);

    return {
      access_token,
      refresh_token,
    };
  }
}
