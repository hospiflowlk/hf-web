import { Module } from '@nestjs/common';
import { WalkInService } from './walk-in.service';
import { WalkInController } from './walk-in.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WalkInController],
  providers: [WalkInService],
  exports: [WalkInService],
})
export class WalkInModule {}
