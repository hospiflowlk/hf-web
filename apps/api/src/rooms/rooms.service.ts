import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  async getCheckedInRooms() {
    return this.prisma.room.findMany({
      where: {
        isDeleted: false,
        reservations: {
          some: {
            status: 'CHECKED_IN',
            isDeleted: false,
          },
        },
      },
      include: {
        reservations: {
          where: {
            status: 'CHECKED_IN',
            isDeleted: false,
          },
          include: {
            guest: true,
            posOrders: {
              where: { 
                paymentMethod: 'ROOM_CHARGE',
                isDeleted: false,
                status: { not: 'CANCELLED' }
              },
              include: {
                items: {
                  include: { item: true }
                }
              }
            }
          }
        },
        category: true,
      },
      orderBy: { number: 'asc' },
    });
  }

  async getAllRooms() {
    return this.prisma.room.findMany({
      where: { isDeleted: false },
      include: { category: true },
      orderBy: { number: 'asc' }
    });
  }

  async getRoomCategories() {
    return this.prisma.roomCategory.findMany({
      where: { isDeleted: false }
    });
  }

  async createTestCheckIn(roomId: string, guestData: any) {
    const guest = await this.prisma.guest.create({
      data: {
        firstName: guestData.firstName || 'Test',
        lastName: guestData.lastName || 'Guest',
      }
    });
    
    return this.prisma.legacyReservation.create({
      data: {
        roomId,
        guestId: guest.id,
        status: 'CHECKED_IN',
        checkIn: new Date(),
        checkOut: new Date(Date.now() + 86400000), // +1 day
      }
    });
  }

  async deleteActiveCheckin(reservationId: string) {
    const reservation = await this.prisma.legacyReservation.findFirst({
      where: { id: reservationId, isDeleted: false, status: 'CHECKED_IN' },
      include: {
        posOrders: {
          where: { isDeleted: false, status: { not: 'CANCELLED' } }
        }
      }
    });
    if (!reservation) throw new Error("Active check-in not found");
    
    if (reservation.posOrders && reservation.posOrders.length > 0) {
      throw new Error("Cannot void check-in: This room has active POS orders. Please checkout or cancel the orders first.");
    }
    
    await this.prisma.legacyReservation.update({
      where: { id: reservationId },
      data: { isDeleted: true }
    });
    return { success: true };
  }

  async updateActiveCheckin(reservationId: string, data: any) {
    const reservation = await this.prisma.legacyReservation.findFirst({
      where: { id: reservationId, isDeleted: false, status: 'CHECKED_IN' },
    });
    if (!reservation || !reservation.guestId) throw new Error("Active check-in or guest not found");
    
    await this.prisma.guest.update({
      where: { id: reservation.guestId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
      }
    });
    return { success: true };
  }

  async checkoutGuest(roomId: string) {
    const reservation = await this.prisma.legacyReservation.findFirst({
      where: { roomId, status: 'CHECKED_IN', isDeleted: false },
      include: { 
        guest: true, 
        room: true, 
        posOrders: {
          include: { items: { include: { item: { include: { exemptTaxes: true } } } } }
        } 
      }
    });

    if (!reservation) {
      throw new Error("No active guest checked in to this room.");
    }

    const validPosOrders = reservation.posOrders.filter(o => !o.isDeleted && o.status !== 'CANCELLED' && o.paymentMethod === 'ROOM_CHARGE');
    let posTotal = validPosOrders.reduce((sum, o) => sum + o.total, 0);

    const allTaxes = await this.prisma.tax.findMany({ where: { isActive: true } });
    const invoiceItems: any[] = [];

    validPosOrders.forEach((o: any) => {
      o.items.forEach((oi: any) => {
        let itemTaxAmount = 0;
        let scAmount = 0;
        let vatAmount = 0;
        let otherTaxAmount = 0;
        const appliedTaxIds: string[] = [];
        
        const itemTotal = oi.totalPrice;
        const exemptTaxIds = oi.item?.exemptTaxes?.map((t: any) => t.id) || [];
        
        allTaxes.forEach(taxObj => {
          if (!exemptTaxIds.includes(taxObj.id)) {
            const taxVal = itemTotal * (taxObj.rate / 100);
            itemTaxAmount += taxVal;
            appliedTaxIds.push(taxObj.id);
            
            if (taxObj.type === "VAT") vatAmount += taxVal;
            else if (taxObj.type === "SC") scAmount += taxVal;
            else otherTaxAmount += taxVal;
          }
        });

        invoiceItems.push({
          itemId: oi.itemId,
          description: oi.item?.name || 'Item',
          quantity: oi.quantity,
          unitPrice: oi.unitPrice,
          netAmount: itemTotal,
          scAmount,
          vatAmount,
          otherTaxAmount,
          taxIds: appliedTaxIds.length > 0 ? appliedTaxIds.join(',') : null,
          total: itemTotal + itemTaxAmount
        });
      });
      
      if (o.tip && o.tip > 0) {
        invoiceItems.push({
          description: `Tip`,
          quantity: 1,
          unitPrice: o.tip,
          netAmount: o.tip,
          total: o.tip,
          taxIds: null
        });
      }
    });

    if (invoiceItems.length === 0) {
      invoiceItems.push({
        description: `Room Stay (No POS Charges)`,
        quantity: 1,
        unitPrice: 0,
        netAmount: 0,
        total: 0
      });
    }

    const invoiceNum = `INV-${Date.now().toString().slice(-6)}`;
    const guestName = reservation.guest ? `${reservation.guest.firstName} ${reservation.guest.lastName}` : `Room ${reservation.room.number} Guest`;

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNum,
        guestName,
        status: 'Unpaid',
        totalAmount: posTotal,
        isDraft: true,
        notes: `Automatically generated upon checkout for Room ${reservation.room.number}.`,
        items: {
          create: invoiceItems
        }
      }
    });

    // Check out the reservation
    await this.prisma.legacyReservation.update({
      where: { id: reservation.id },
      data: { 
        status: 'CHECKED_OUT',
        checkOut: new Date()
      }
    });

    return { success: true, invoiceId: invoice.id };
  }

  async repostBill(reservationId: string) {
    const reservation = await this.prisma.legacyReservation.findFirst({
      where: { id: reservationId, isDeleted: false },
      include: { 
        guest: true, 
        room: true, 
        posOrders: {
          include: { items: { include: { item: { include: { exemptTaxes: true } } } } }
        } 
      }
    });

    if (!reservation) throw new Error("Reservation not found");

    const validPosOrders = reservation.posOrders.filter(o => !o.isDeleted && o.status !== 'CANCELLED' && o.paymentMethod === 'ROOM_CHARGE');
    let posTotal = validPosOrders.reduce((sum, o) => sum + o.total, 0);

    const allTaxes = await this.prisma.tax.findMany({ where: { isActive: true } });
    const invoiceItems: any[] = [];

    validPosOrders.forEach((o: any) => {
      o.items.forEach((oi: any) => {
        let itemTaxAmount = 0;
        let scAmount = 0;
        let vatAmount = 0;
        let otherTaxAmount = 0;
        const appliedTaxIds: string[] = [];
        
        const itemTotal = oi.totalPrice;
        const exemptTaxIds = oi.item?.exemptTaxes?.map((t: any) => t.id) || [];
        
        allTaxes.forEach(taxObj => {
          if (!exemptTaxIds.includes(taxObj.id)) {
            const taxVal = itemTotal * (taxObj.rate / 100);
            itemTaxAmount += taxVal;
            appliedTaxIds.push(taxObj.id);
            
            if (taxObj.type === "VAT") vatAmount += taxVal;
            else if (taxObj.type === "SC") scAmount += taxVal;
            else otherTaxAmount += taxVal;
          }
        });

        invoiceItems.push({
          itemId: oi.itemId,
          description: oi.item?.name || 'Item',
          quantity: oi.quantity,
          unitPrice: oi.unitPrice,
          netAmount: itemTotal,
          scAmount,
          vatAmount,
          otherTaxAmount,
          taxIds: appliedTaxIds.length > 0 ? appliedTaxIds.join(',') : null,
          total: itemTotal + itemTaxAmount
        });
      });
      
      if (o.tip && o.tip > 0) {
        invoiceItems.push({
          description: `Tip`,
          quantity: 1,
          unitPrice: o.tip,
          netAmount: o.tip,
          total: o.tip,
          taxIds: null
        });
      }
    });

    if (invoiceItems.length === 0) {
      invoiceItems.push({
        description: `Room Stay (No POS Charges)`,
        quantity: 1,
        unitPrice: 0,
        netAmount: 0,
        total: 0
      });
    }

    const invoiceNum = `INV-${Date.now().toString().slice(-6)}`;
    const guestName = reservation.guest ? `${reservation.guest.firstName} ${reservation.guest.lastName}` : `Room ${reservation.room.number} Guest`;

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNum,
        guestName,
        status: 'Unpaid',
        totalAmount: posTotal,
        isDraft: true,
        notes: `Re-posted bill for Room ${reservation.room.number}.`,
        items: {
          create: invoiceItems
        }
      }
    });

    return { success: true, invoiceId: invoice.id };
  }

  async unCheckoutGuest(reservationId: string) {
    const reservation = await this.prisma.legacyReservation.findFirst({
      where: { id: reservationId, isDeleted: false },
      include: { room: { include: { reservations: { where: { status: 'CHECKED_IN', isDeleted: false } } } } }
    });

    if (!reservation) throw new Error("Reservation not found");
    if (reservation.status !== 'CHECKED_OUT') throw new Error("Reservation is not checked out");
    if (reservation.room.reservations.length > 0) throw new Error("Room already has an active check-in");

    // set checkOut to a day from now to make it active again
    const newCheckOut = new Date();
    newCheckOut.setDate(newCheckOut.getDate() + 1);

    await this.prisma.legacyReservation.update({
      where: { id: reservationId },
      data: {
        status: 'CHECKED_IN',
        checkOut: newCheckOut
      }
    });
    return { success: true };
  }

  async getRecentCheckouts() {
    const reservations = await this.prisma.legacyReservation.findMany({
      where: {
        status: 'CHECKED_OUT',
        isDeleted: false,
      },
      orderBy: { checkOut: 'desc' },
      take: 50,
      include: {
        guest: true,
        room: { include: { category: true } },
        posOrders: {
          where: { 
            paymentMethod: 'ROOM_CHARGE',
            isDeleted: false,
            status: { not: 'CANCELLED' }
          },
          include: {
            items: {
              include: { item: true }
            }
          }
        }
      }
    });

    return reservations.map(res => ({
      ...res.room,
      id: res.id, // Use reservation id as the primary key for the list
      originalRoomId: res.room.id,
      reservations: [res]
    }));
  }

  async deleteCheckout(reservationId: string) {
    await this.prisma.order.updateMany({
      where: { legacyReservationId: reservationId },
      data: { isDeleted: true }
    });
    return this.prisma.legacyReservation.update({
      where: { id: reservationId },
      data: { isDeleted: true }
    });
  }

  async deleteAllCheckouts() {
    const reservationsToDelete = await this.prisma.legacyReservation.findMany({
      where: {
        status: 'CHECKED_OUT',
        isDeleted: false
      },
      select: { id: true }
    });
    
    const reservationIds = reservationsToDelete.map(r => r.id);

    if (reservationIds.length > 0) {
      await this.prisma.order.updateMany({
        where: { legacyReservationId: { in: reservationIds } },
        data: { isDeleted: true }
      });
      
      return this.prisma.legacyReservation.updateMany({
        where: { id: { in: reservationIds } },
        data: { isDeleted: true }
      });
    }
    
    return { count: 0 };
  }

  async getGrid(startDate: string, endDate: string, filters: {
    tab?: string;
    dayUse?: boolean;
    statuses?: string[];
    search?: string;
  } = {}) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0); // Normalize to start of day
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const categories = await this.prisma.roomCategory.findMany({
      where: { isDeleted: false },
      include: {
        rooms: {
          where: { isDeleted: false },
          orderBy: { number: 'asc' },
          include: {
            outOfOrders: {
              where: {
                startDate: { lte: end },
                endDate: { gte: start }
              }
            }
          }
        },
      },
    });

    let reservationWhere: any = {
      isDeleted: false,
      checkIn: { lt: end },
      checkOut: { gt: start },
    };

    if (filters.statuses && filters.statuses.length > 0) {
      reservationWhere.status = { in: filters.statuses };
    }

    if (filters.search) {
      reservationWhere.OR = [
        { guest: { firstName: { contains: filters.search } } },
        { guest: { lastName: { contains: filters.search } } },
        { guest: { email: { contains: filters.search } } },
        { companyName: { contains: filters.search } },
      ];
    }
    
    // Filtering by Tab
    if (filters.tab === 'Arrival') {
      reservationWhere.checkIn = { gte: start, lte: end };
    } else if (filters.tab === 'Departure') {
      reservationWhere.checkOut = { gte: start, lte: end };
    } else if (filters.tab === 'In House') {
      reservationWhere.status = 'CHECKED_IN';
    } else if (filters.tab === 'Front Desk') {
      reservationWhere.status = { notIn: ['CANCELLED', 'NO_SHOW'] };
    }
    
    // If Day Use is false, we can exclude reservations where checkIn == checkOut
    // (Prisma doesn't have direct column comparison in where, so we'll filter in JS if needed,
    // but typically Day Use means checkIn day == checkOut day. We'll filter in memory for simplicity).

    let reservations = await this.prisma.legacyReservation.findMany({
      where: reservationWhere,
      include: {
        guest: true,
      },
    });

    if (filters.dayUse === false) {
      // Filter out same-day reservations
      reservations = reservations.filter(r => {
        const ci = new Date(r.checkIn);
        const co = new Date(r.checkOut);
        return ci.toDateString() !== co.toDateString();
      });
    }

    // Calculate Occupancy Stats for each day in the range
    const days: any[] = [];
    let current = new Date(start);
    const totalRooms = categories.reduce((sum, cat) => sum + cat.rooms.length, 0);

    while (current <= end) {
      const dayStart = new Date(current);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(current);
      dayEnd.setHours(23, 59, 59, 999);
      const dateString = dayStart.toISOString();

      let outOfOrderCount = 0;
      categories.forEach(cat => {
        cat.rooms.forEach(room => {
          if (room.outOfOrders.some(ooo => ooo.startDate <= dayEnd && ooo.endDate >= dayStart)) {
            outOfOrderCount++;
          }
        });
      });

      const sellableRooms = totalRooms - outOfOrderCount;
      
      let occupiedCount = 0;
      let blockedCount = 0;
      let arrivalCount = 0;
      let departureCount = 0;

      reservations.forEach(r => {
        const ci = new Date(r.checkIn);
        const co = new Date(r.checkOut);
        
        // Active on this day (overnight logic: checkIn <= dayEnd AND checkOut > dayStart)
        // If it's a day-use (ci == co), check if it's on this day
        const isDayUse = ci.toDateString() === co.toDateString();
        const isActive = isDayUse 
          ? (ci.toDateString() === dayStart.toDateString())
          : (ci <= dayEnd && co > dayStart);

        if (isActive) {
          if (r.status === 'BLOCK') {
            blockedCount++;
          } else if (r.status !== 'CANCELLED' && r.status !== 'NO_SHOW') {
            occupiedCount++;
          }
        }

        if (ci.toDateString() === dayStart.toDateString() && r.status !== 'CANCELLED') arrivalCount++;
        if (co.toDateString() === dayStart.toDateString() && r.status !== 'CANCELLED') departureCount++;
      });

      const availableRooms = sellableRooms - occupiedCount - blockedCount;
      const occupancyPercent = sellableRooms > 0 ? ((occupiedCount + blockedCount) / sellableRooms) * 100 : 0;

      days.push({
        date: dateString,
        totalRooms,
        outOfOrder: outOfOrderCount,
        sellable: sellableRooms,
        occupied: occupiedCount,
        blocked: blockedCount,
        available: availableRooms,
        occupancyPercent: Math.round(occupancyPercent),
        arrivals: arrivalCount,
        departures: departureCount,
      });

      current.setDate(current.getDate() + 1);
    }

    // Clean up outOfOrders from response payload to reduce size if preferred, or keep them for UI rendering
    return {
      categories,
      reservations,
      stats: days,
    };
  }

  async createOutOfOrder(roomId: string, data: { startDate: string, endDate: string, reason: string, notes?: string }) {
    // Basic validation
    const existingReservations = await this.prisma.legacyReservation.findFirst({
      where: {
        roomId,
        isDeleted: false,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        checkIn: { lt: new Date(data.endDate) },
        checkOut: { gt: new Date(data.startDate) },
      }
    });

    if (existingReservations) {
      throw new Error('Room has active reservations during this period.');
    }

    return this.prisma.roomOutOfOrder.create({
      data: {
        roomId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        reason: data.reason,
        notes: data.notes
      }
    });
  }

  async removeOutOfOrder(id: string) {
    return this.prisma.roomOutOfOrder.delete({
      where: { id }
    });
  }

  async createRoom(data: { number: string; categoryId: string }) {
    // Check if room number already exists
    const existing = await this.prisma.room.findFirst({
      where: { number: data.number, isDeleted: false }
    });
    
    if (existing) {
      throw new Error('Room number already exists');
    }

    return this.prisma.room.create({
      data: {
        number: data.number,
        categoryId: data.categoryId,
        status: 'CLEAN'
      }
    });
  }

  async deleteRoom(id: string) {
    return this.prisma.room.update({
      where: { id },
      data: { isDeleted: true }
    });
  }
}

