import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const isDryRun = process.argv.includes('--dry-run');

  console.log(`Starting Legacy Reservations Migration...`);
  if (isDryRun) {
    console.log(`[DRY RUN MODE] No changes will be written to the database.`);
  }

  const legacyReservations = await prisma.legacyReservation.findMany({
    where: { isDeleted: false }
  });

  console.log(`Found ${legacyReservations.length} active legacy reservations.`);

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const legacy of legacyReservations) {
    try {
      // Check if already migrated
      const existing = await prisma.reservation.findUnique({ where: { id: legacy.id } });
      if (existing) {
        console.log(`[SKIPPED] Reservation ${legacy.id} already migrated.`);
        skippedCount++;
        continue;
      }

      // Map Booking Source
      let source = 'DIRECT_LOCAL';
      if (legacy.source) {
        const s = legacy.source.toLowerCase();
        if (s.includes('booking')) source = 'BOOKING_COM';
        else if (s.includes('agoda')) source = 'AGODA';
        else if (s.includes('agent')) source = 'TRAVEL_AGENT';
        else source = 'OTHER_OTA';
      }

      const parentTotalMinor = Math.round(legacy.totalPrice * 100);

      if (!isDryRun) {
        await prisma.$transaction(async (tx) => {
          // Create Parent
          await tx.reservation.create({
            data: {
              id: legacy.id,
              status: legacy.status as any,
              bookingSource: source as any,
              checkInDatetime: legacy.checkIn,
              checkOutDatetime: legacy.checkOut,
              groupName: legacy.companyName || legacy.guestId || 'Legacy Guest',
              parentTotalMinor: parentTotalMinor,
              createdAt: legacy.createdAt,
              updatedAt: legacy.updatedAt,
              guestId: legacy.guestId,
              internalRemarks: legacy.notes,
              allocations: {
                create: {
                  roomId: legacy.roomId,
                  checkInDatetime: legacy.checkIn,
                  checkOutDatetime: legacy.checkOut,
                  usesCustomStayDates: false,
                  rateAmountMinor: parentTotalMinor,
                  totalAmountMinor: parentTotalMinor,
                  createdAt: legacy.createdAt,
                  updatedAt: legacy.updatedAt
                }
              }
            }
          });
          
        });
      }
      
      console.log(`[MIGRATED] Legacy ${legacy.id}`);
      successCount++;
    } catch (error) {
      console.error(`[ERROR] Failed to migrate ${legacy.id}:`, error);
      errorCount++;
    }
  }

  console.log(`\n=== Migration Report ===`);
  console.log(`Total Legacy Found: ${legacyReservations.length}`);
  console.log(`Successfully Migrated: ${successCount}`);
  console.log(`Skipped (Already Migrated): ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);

  await app.close();
}

bootstrap().catch(err => {
  console.error(err);
  process.exit(1);
});
