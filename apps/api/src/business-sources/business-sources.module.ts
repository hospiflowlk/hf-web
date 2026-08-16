import { Module } from '@nestjs/common';
import { BusinessSourcesController } from './business-sources.controller';
import { BusinessSourcesService } from './business-sources.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BusinessSourcesController],
  providers: [BusinessSourcesService],
})
export class BusinessSourcesModule {}
