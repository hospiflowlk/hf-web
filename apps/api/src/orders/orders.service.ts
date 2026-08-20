import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentMethod } from '@prisma/client';
import { OrderType } from '@prisma/client';

import { IsString, IsOptional, IsArray, ValidateNested, IsEnum, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsString()
  itemId: string;

  @IsNumber()
  @Type(() => Number)
  quantity: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateOrderDto {
  @IsEnum(OrderType)
  orderType: OrderType;

  @IsOptional()
  @IsString()
  guestId?: string;

  @IsOptional()
  @IsString()
  roomId?: string;

  @IsOptional()
  @IsString()
  walkInSessionId?: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  isHB?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async createOrder(dto: CreateOrderDto) {
    try {
      let subtotal = 0;
      let tax = 0;
      const orderItemsData: any[] = [];

      // 1. Parallelize initial validation & master data queries
      const itemIds = dto.items.map(i => i.itemId);

      const reservationPromise = dto.orderType === 'ROOM'
        ? (dto.roomId 
            ? this.prisma.legacyReservation.findFirst({
                where: { roomId: dto.roomId, status: 'CHECKED_IN', isDeleted: false },
                select: { id: true }
              })
            : Promise.reject(new BadRequestException('roomId is required for ROOM orders')))
        : dto.orderType === 'WALK_IN'
        ? (dto.walkInSessionId
            ? this.prisma.walkInSession.findUnique({
                where: { id: dto.walkInSessionId },
                select: { id: true, status: true }
              })
            : Promise.reject(new BadRequestException('walkInSessionId is required for WALK_IN orders')))
        : Promise.resolve(null);

      const taxesPromise = this.prisma.tax.findMany({ where: { isActive: true } });
      const itemsPromise = this.prisma.item.findMany({
        where: { id: { in: itemIds } },
        include: {
          compositeOf: { include: { ingredient: true } },
          exemptTaxes: true,
        },
      });

      const [resData, taxes, dbItems] = await Promise.all([
        reservationPromise,
        taxesPromise,
        itemsPromise
      ]);

      let legacyReservationId: string | undefined;
      if (dto.orderType === 'ROOM') {
        if (!resData) throw new BadRequestException('This room does not have an active checked-in guest.');
        legacyReservationId = (resData as any).id;
      } else if (dto.orderType === 'WALK_IN') {
        if (!resData || (resData as any).status !== 'ACTIVE') {
          throw new BadRequestException('Invalid or closed Walk-In Session');
        }
      }

      const itemMap = new Map(dbItems.map(i => [i.id, i]));

      // 2. Validate items and calculate subtotal & tax using the pre-fetched map
      for (const orderItem of dto.items) {
        const invItem = itemMap.get(orderItem.itemId);

        if (!invItem) {
          throw new BadRequestException(`Item ${orderItem.itemId} not found`);
        }

        const itemTotal = (invItem.defaultPrice || 0) * orderItem.quantity;
        subtotal += itemTotal;

        // Calculate Tax for this item
        let itemTaxAmount = 0;
        const exemptTaxIds = invItem.exemptTaxes?.map(t => t.id) || [];
        
        taxes.forEach(taxObj => {
          if (!exemptTaxIds.includes(taxObj.id)) {
            const taxVal = itemTotal * (taxObj.rate / 100);
            itemTaxAmount += taxVal;
          }
        });
        
        tax += itemTaxAmount;

        orderItemsData.push({
          itemId: invItem.id,
          quantity: orderItem.quantity,
          unitPrice: invItem.defaultPrice || 0,
          totalPrice: itemTotal,
          note: orderItem.note,
        });
      }

      const total = subtotal + tax;

      // 3. Transaction: Create Order, parallelize inventory deductions and batch insert inventory transactions
      const order = await this.prisma.$transaction(async (tx) => {
        const newOrder = await tx.order.create({
          data: {
            orderType: dto.orderType,
            guestId: dto.guestId,
            roomId: dto.roomId,
            legacyReservationId,
            walkInSessionId: dto.walkInSessionId,
            paymentMethod: dto.paymentMethod,
            status: (dto.paymentMethod === 'ROOM_CHARGE' && !dto.isHB) ? 'PENDING' : 'PAID',
            subtotal,
            tax,
            total: dto.isHB ? 0 : total,
            originalTotal: dto.isHB ? total : null,
            items: {
              create: orderItemsData,
            },
          },
          include: { items: true },
        });

        // Collect inventory updates and transactions in memory
        const inventoryUpdates: Promise<any>[] = [];
        const inventoryTransactions: any[] = [];

        for (const orderItem of dto.items) {
          const itemObj = itemMap.get(orderItem.itemId);
          if (!itemObj) continue;

          if (itemObj.itemType === 'composite' && itemObj.compositeOf && itemObj.compositeOf.length > 0) {
            for (const ing of itemObj.compositeOf) {
              if (ing.ingredient?.trackStock) {
                const deductionQty = ing.quantity * orderItem.quantity;
                inventoryUpdates.push(
                  tx.item.update({
                    where: { id: ing.ingredientItemId },
                    data: { stockQuantity: { decrement: deductionQty } }
                  })
                );
                inventoryTransactions.push({
                  itemId: ing.ingredientItemId,
                  type: 'OUT',
                  quantity: deductionQty,
                  reference: `Order ${newOrder.id}`,
                  remarks: `Used in ${itemObj.name} (POS Sale)`
                });
              }
            }
          } else if (itemObj.trackStock) {
            inventoryUpdates.push(
              tx.item.update({
                where: { id: orderItem.itemId },
                data: { stockQuantity: { decrement: orderItem.quantity } }
              })
            );
            inventoryTransactions.push({
              itemId: orderItem.itemId,
              type: 'OUT',
              quantity: orderItem.quantity,
              reference: `Order ${newOrder.id}`,
              remarks: `POS Sale`
            });
          }
        }

        // Execute all inventory updates and batch log transaction in parallel
        await Promise.all([
          ...inventoryUpdates,
          inventoryTransactions.length > 0
            ? tx.inventoryTransaction.createMany({ data: inventoryTransactions })
            : Promise.resolve()
        ]);

        return newOrder;
      });

      return order;

    } catch (e: any) {
      throw new BadRequestException(e.message || "Unknown Server Error");
    }
  }

  async getActiveOrders() {
    const recentCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // completed in past 24h

    const orders = await this.prisma.order.findMany({
      where: {
        isDeleted: false,
        OR: [
          { status: { in: ['PENDING', 'PREPARING'] } },
          {
            status: { in: ['SERVED', 'PAID'] },
            createdAt: { gte: recentCutoff }
          }
        ]
      },
      select: {
        id: true,
        orderType: true,
        status: true,
        paymentMethod: true,
        createdAt: true,
        subtotal: true,
        tax: true,
        total: true,
        originalTotal: true,
        items: {
          select: {
            id: true,
            quantity: true,
            note: true,
            item: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        walkInSession: {
          select: {
            id: true,
            guestName: true,
            referenceNumber: true
          }
        },
        legacyReservation: {
          select: {
            id: true,
            room: {
              select: {
                id: true,
                number: true
              }
            },
            guest: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return orders.sort((a: any, b: any) => {
      const isRoomA = a.orderType === 'ROOM';
      const isRoomB = b.orderType === 'ROOM';
      
      if (isRoomA && !isRoomB) return -1;
      if (!isRoomA && isRoomB) return 1;
      
      if (isRoomA && isRoomB) {
        const roomA = a.legacyReservation?.room?.number || '';
        const roomB = b.legacyReservation?.room?.number || '';
        if (roomA !== roomB) return roomA.localeCompare(roomB);
      }
      
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }


  async getOrderHistory() {
    const orders = await this.prisma.order.findMany({
      where: {
        isDeleted: false
      },
      take: 100,
      select: {
        id: true,
        orderType: true,
        status: true,
        paymentMethod: true,
        createdAt: true,
        subtotal: true,
        tax: true,
        total: true,
        originalTotal: true,
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
        },
        walkInSession: {
          select: {
            id: true,
            guestName: true,
            referenceNumber: true
          }
        },
        legacyReservation: {
          select: {
            id: true,
            room: {
              select: {
                id: true,
                number: true
              }
            },
            guest: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return orders;
  }


  async deleteOrder(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new BadRequestException('Order not found');
    }
    
    // In a real POS, deleting/voiding an order should restore inventory.
    // For this prototype, we'll mark it as CANCELLED and deleted.
    return this.prisma.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        isDeleted: true
      }
    });
  }

  async updateOrderStatus(id: string, status: any) {
    return this.prisma.order.update({
      where: { id },
      data: { status }
    });
  }

  async signOrder(id: string, signatureData: string, tip: number) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    const tipAmount = tip || 0;
    // We shouldn't double-add tip if they sign twice, though they shouldn't sign twice.
    // Assuming originalTotal has the pre-tip total.
    const originalTotal = order.originalTotal !== null ? order.originalTotal : order.total;
    const newTotal = originalTotal + tipAmount;

    return this.prisma.order.update({
      where: { id },
      data: {
        signatureData,
        tip: tipAmount,
        signedAt: new Date(),
        originalTotal, // Ensure it's set
        total: newTotal,
        status: 'PAID'
      }
    });
  }
}
