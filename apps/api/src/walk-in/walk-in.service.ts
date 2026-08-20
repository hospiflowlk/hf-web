import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WalkInService {
  constructor(private prisma: PrismaService) {}

  async create(data: { guestName: string; guestCount: number }) {
    const referenceNumber = `WI-${Date.now()}`;
    return this.prisma.walkInSession.create({
      data: {
        referenceNumber,
        guestName: data.guestName,
        guestCount: data.guestCount,
        status: 'ACTIVE',
      },
    });
  }

  async findAllActive() {
    return this.prisma.walkInSession.findMany({
      where: { status: 'ACTIVE', isDeleted: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        referenceNumber: true,
        guestName: true,
        guestCount: true,
        status: true,
        createdAt: true,
        orders: {
          where: {
            isDeleted: false,
            status: { not: 'CANCELLED' }
          },
          select: {
            id: true,
            total: true,
            subtotal: true,
            tax: true,
            status: true,
            paymentMethod: true,
            createdAt: true,
            items: {
              select: {
                id: true,
                quantity: true,
                unitPrice: true,
                totalPrice: true,
                note: true,
                item: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        }
      },
    });
  }

  async findAllActiveBasic() {
    return this.prisma.walkInSession.findMany({
      where: { status: 'ACTIVE', isDeleted: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        referenceNumber: true,
        guestName: true,
        guestCount: true,
      }
    });
  }

  async checkoutSession(id: string) {
    const session = await this.prisma.walkInSession.findUnique({
      where: { id },
      include: { orders: true }
    });
    if (!session) throw new NotFoundException('Walk-in session not found');

    let posTotal = 0;
    session.orders.forEach(o => {
      if (!o.isDeleted && o.status !== 'CANCELLED' && o.paymentMethod === 'ROOM_CHARGE') {
        posTotal += o.total;
      }
    });

    if (posTotal > 0) {
      const invoiceNum = `INV-${Date.now().toString().slice(-6)}`;
      await this.prisma.invoice.create({
        data: {
          invoiceNum,
          guestName: session.guestName,
          status: 'Unpaid',
          totalAmount: posTotal,
          isDraft: true,
          notes: `Automatically generated upon checkout for Walk-In Session: ${session.guestName}.`,
          items: {
            create: [{
              description: `POS Restaurant / Service Charges (Walk-In)`,
              quantity: 1,
              unitPrice: posTotal,
              netAmount: posTotal,
              total: posTotal
            }]
          }
        }
      });
    }

    return this.prisma.walkInSession.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
  }

  async findAllClosed() {
    return this.prisma.walkInSession.findMany({
      where: { status: 'CLOSED', isDeleted: false },
      orderBy: { closedAt: 'desc' },
      take: 30,
      select: {
        id: true,
        referenceNumber: true,
        guestName: true,
        guestCount: true,
        status: true,
        createdAt: true,
        closedAt: true,
        orders: {
          where: { 
            paymentMethod: 'ROOM_CHARGE',
            isDeleted: false,
            status: { not: 'CANCELLED' }
          },
          select: {
            id: true,
            total: true,
            subtotal: true,
            tax: true,
            status: true,
            createdAt: true,
            items: {
              select: {
                id: true,
                quantity: true,
                unitPrice: true,
                totalPrice: true,
                note: true,
                item: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        }
      },
    });
  }


  async repostBill(id: string) {
    const session = await this.prisma.walkInSession.findUnique({
      where: { id },
      include: { orders: true }
    });
    if (!session) throw new NotFoundException('Walk-in session not found');

    let posTotal = 0;
    session.orders.forEach(o => {
      if (!o.isDeleted && o.status !== 'CANCELLED' && o.paymentMethod === 'ROOM_CHARGE') {
        posTotal += o.total;
      }
    });

    const invoiceNum = `INV-${Date.now().toString().slice(-6)}`;
    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNum,
        guestName: session.guestName,
        status: 'Unpaid',
        totalAmount: posTotal,
        isDraft: true,
        notes: `Re-posted bill for Walk-In Session: ${session.guestName}.`,
        items: {
          create: [{
            description: `POS Restaurant / Service Charges (Walk-In)`,
            quantity: 1,
            unitPrice: posTotal,
            netAmount: posTotal,
            total: posTotal
          }]
        }
      }
    });
    return { success: true, invoiceId: invoice.id };
  }

  async unCheckout(id: string) {
    return this.prisma.walkInSession.update({
      where: { id },
      data: { status: 'ACTIVE', closedAt: null },
    });
  }

  async deleteSession(id: string) {
    await this.prisma.order.updateMany({
      where: { walkInSessionId: id },
      data: { isDeleted: true }
    });
    return this.prisma.walkInSession.update({
      where: { id },
      data: { isDeleted: true }
    });
  }

  async deleteAllSessions() {
    const sessionsToDelete = await this.prisma.walkInSession.findMany({
      where: { status: 'CLOSED', isDeleted: false },
      select: { id: true }
    });
    
    const sessionIds = sessionsToDelete.map(s => s.id);

    if (sessionIds.length > 0) {
      await this.prisma.order.updateMany({
        where: { walkInSessionId: { in: sessionIds } },
        data: { isDeleted: true }
      });
      
      return this.prisma.walkInSession.updateMany({
        where: { id: { in: sessionIds } },
        data: { isDeleted: true }
      });
    }
    return { count: 0 };
  }
}
