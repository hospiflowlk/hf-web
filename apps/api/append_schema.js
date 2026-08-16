const fs = require('fs');
const content = `
// =========================
// ENUMS
// =========================
enum BookingSource {
  BOOKING_COM
  AGODA
  OTHER_OTA
  TRAVEL_AGENT
  DIRECT_LOCAL
  DIRECT_FOREIGN
}

enum ReservationStatus {
  TENTATIVE
  CONFIRMED
  CHECKED_IN
  CHECKED_OUT
  CANCELLED
  NO_SHOW
}

enum ChannelSyncStatus {
  NOT_APPLICABLE
  PENDING
  SYNCED
  FAILED
  CONFLICT
}

enum SupportedCurrency {
  LKR
  USD
  EUR
  GBP
}

// =========================
// SETTINGS
// =========================
model ReservationSettings {
  id                        String   @id @default("default")
  maxActiveRooms            Int      @default(20)
  defaultCheckInTime        String   @default("14:00")
  defaultCheckOutTime       String   @default("12:00")
  tentativeBlocksInventory  Boolean  @default(true)
  timezone                  String   @default("Asia/Colombo")
  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt
}

// =========================
// MODELS
// =========================
model Reservation {
  id                 String             @id @default(uuid())
  bookingReference   String?
  bookingSource      BookingSource      @default(DIRECT_LOCAL)
  travelAgent        String?
  tourNo             String?
  groupName          String?
  
  status             ReservationStatus  @default(CONFIRMED)
  
  // Default stay dates for the group
  checkInDatetime    DateTime
  checkOutDatetime   DateTime
  isDayRoom          Boolean            @default(false)
  
  ratePlan           String?
  currency           SupportedCurrency  @default(LKR)
  mealPlan           String?
  
  // Totals (Integer Minor Units)
  parentTotalMinor   Int                @default(0)
  
  guestId            String?
  guest              Guest?             @relation(fields: [guestId], references: [id])
  guestTitle         String?
  guestName          String?
  mobile             String?
  email              String?
  country            String?
  
  guestRemarks       String?
  internalRemarks    String?
  
  // Channel Sync
  externalBookingId  String?
  channelName        String?
  syncStatus         ChannelSyncStatus  @default(NOT_APPLICABLE)
  lastSyncedAt       DateTime?
  channelPayloadJson Json?
  
  // Audit Trail
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt
  cancelledAt        DateTime?
  cancellationReason String?

  createdById        String?
  createdBy          User?              @relation("ResCreated", fields: [createdById], references: [id])
  updatedById        String?
  updatedBy          User?              @relation("ResUpdated", fields: [updatedById], references: [id])
  cancelledById      String?
  cancelledBy        User?              @relation("ResCancelled", fields: [cancelledById], references: [id])

  allocations        ReservationRoomAllocation[]

  @@index([checkInDatetime])
  @@index([checkOutDatetime])
  @@index([status])
  @@index([bookingReference])
  @@unique([channelName, externalBookingId])
}

model ReservationRoomAllocation {
  id               String      @id @default(uuid())
  reservationId    String
  reservation      Reservation @relation(fields: [reservationId], references: [id], onDelete: Cascade)
  
  roomId           String
  room             Room        @relation(fields: [roomId], references: [id])
  
  // Effective Stay Dates (Source of Truth)
  checkInDatetime  DateTime
  checkOutDatetime DateTime
  usesCustomStayDates Boolean  @default(false)
  
  occupancy        Int         @default(1)
  bedType          String?
  adults           Int         @default(1)
  children         Int         @default(0)
  
  // Money in Integer Minor Units
  rateAmountMinor  Int         @default(0)
  totalAmountMinor Int         @default(0)
  isFoc            Boolean     @default(false)
  
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt

  @@index([reservationId])
  @@index([roomId])
  @@index([roomId, checkInDatetime])
  @@index([roomId, checkOutDatetime])
  @@index([checkInDatetime, checkOutDatetime])
}
`;
fs.appendFileSync('prisma/schema.prisma', content);
