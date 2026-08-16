import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      }
    });
  }

  async findByName(name: string) {
    return this.prisma.user.findUnique({ where: { name } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(data: any) {
    const existing = await this.findByName(data.name);
    if (existing) {
      throw new BadRequestException('Name already in use');
    }

    const salt = await bcrypt.genSalt(10);
    const pinHash = await bcrypt.hash(data.pin, salt);

    return this.prisma.user.create({
      data: {
        name: data.name,
        pinHash,
        role: data.role || Role.USER,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
      select: {
        id: true,
        name: true,
        role: true,
        isActive: true,
      }
    });
  }

  async update(id: string, data: any) {
    const updateData: any = {
      name: data.name,
      role: data.role,
      isActive: data.isActive,
    };

    if (data.pin) {
      const salt = await bcrypt.genSalt(10);
      updateData.pinHash = await bcrypt.hash(data.pin, salt);
    }

    // Clean up undefined fields
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        role: true,
        isActive: true,
      }
    });
  }

  async delete(id: string) {
    // Soft delete / deactivate
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async updateRefreshToken(userId: string, refreshToken: string | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken },
    });
  }
}
