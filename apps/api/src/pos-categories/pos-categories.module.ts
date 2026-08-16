import { Module } from '@nestjs/common';
import { PosCategoriesService } from './pos-categories.service';
import { PosCategoriesController } from './pos-categories.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PosCategoriesController],
  providers: [PosCategoriesService],
  exports: [PosCategoriesService],
})
export class PosCategoriesModule {}
