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

      // Validate based on orderType
      let legacyReservationId: string | undefined;

      if (dto.orderType === 'ROOM') {
        if (!dto.roomId) throw new BadRequestException('roomId is required for ROOM orders');
        
        // Find active check-in
        const activeRes = await this.prisma.legacyReservation.findFirst({
          where: {
            roomId: dto.roomId,
            status: 'CHECKED_IN',
            isDeleted: false
          }
        });
        if (!activeRes) {
          throw new BadRequestException('This room does not have an active checked-in guest.');
        }
        legacyReservationId = activeRes.id;
      } else if (dto.orderType === 'WALK_IN') {
        if (!dto.walkInSessionId) throw new BadRequestException('walkInSessionId is required for WALK_IN orders');
        const session = await this.prisma.walkInSession.findUnique({ where: { id: dto.walkInSessionId } });
        if (!session || session.status !== 'ACTIVE') {
          throw new BadRequestException('Invalid or closed Walk-In Session');
        }
      }

    // Fetch all active taxes
    const taxes = await this.prisma.tax.findMany({
      where: { isActive: true },
    });

    // 1. Validate items and calculate subtotal & tax
    for (const orderItem of dto.items) {
      const invItem = await this.prisma.item.findUnique({
        where: { id: orderItem.itemId },
        include: { 
          compositeOf: { include: { ingredient: true } },
          exemptTaxes: true
        }
      });

      if (!invItem) {
        throw new BadRequestException(`Item ${orderItem.itemId} not found`);
      }

      if (invItem.itemType === 'composite' && invItem.compositeOf && invItem.compositeOf.length > 0) {
        for (const ing of invItem.compositeOf) {
          if (ing.ingredient?.trackStock) {
            const requiredQty = ing.quantity * orderItem.quantity;
            // if (ing.ingredient.stockQuantity < requiredQty) {
            //   throw new BadRequestException(`Not enough stock for ingredient ${ing.ingredient.name} used in ${invItem.name}`);
            // }
          }
        }
      } else if (invItem.trackStock && invItem.stockQuantity < orderItem.quantity) {
        // throw new BadRequestException(`Not enough stock for ${invItem.name}`);
      }

      const itemTotal = (invItem.defaultPrice || 0) * orderItem.quantity;
      subtotal += itemTotal;

      // Calculate Tax for this item
      let itemTaxAmount = 0;
      const exemptTaxIds = invItem.exemptTaxes?.map(t => t.id) || [];
      
      taxes.forEach(taxObj => {
        if (!exemptTaxIds.includes(taxObj.id)) {
          // In invoice logic: taxVal = taxable * (tax.rate / 100)
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

    // 2. Transaction: Create Order, create OrderItems, decrease inventory
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

        for (const orderItem of dto.items) {
          const itemObj = await tx.item.findUnique({ 
            where: { id: orderItem.itemId },
            include: { compositeOf: { include: { ingredient: true } } }
          });
          
          if (!itemObj) continue;

          if (itemObj.itemType === 'composite' && itemObj.compositeOf && itemObj.compositeOf.length > 0) {
            for (const ing of itemObj.compositeOf) {
              if (ing.ingredient?.trackStock) {
                const deductionQty = ing.quantity * orderItem.quantity;
                await tx.item.update({
                  where: { id: ing.ingredientItemId },
                  data: { stockQuantity: { decrement: deductionQty } }
                });
                await tx.inventoryTransaction.create({
                  data: {
                    itemId: ing.ingredientItemId,
                    type: 'OUT',
                    quantity: deductionQty,
                    reference: `Order ${newOrder.id}`,
                    remarks: `Used in ${itemObj.name} (POS Sale)`
                  }
                });
              }
            }
          } else if (itemObj.trackStock) {
            await tx.item.update({
              where: { id: orderItem.itemId },
              data: {
                stockQuantity: { decrement: orderItem.quantity },
              },
            });
            await tx.inventoryTransaction.create({
              data: {
                itemId: orderItem.itemId,
                type: 'OUT',
                quantity: orderItem.quantity,
                reference: `Order ${newOrder.id}`,
                remarks: `POS Sale`
              }
            });
          }
        }

        return newOrder;
      });

      return order;
    } catch (e: any) {
      throw new BadRequestException(e.message || "Unknown Server Error");
    }
  }

  async getActiveOrders() {
    const orders = await this.prisma.order.findMany({
      where: {
        status: { in: ['PENDING', 'PREPARING', 'SERVED', 'PAID'] },
        isDeleted: false,
        OR: [
          { orderType: 'WALK_IN' },
          {
            orderType: 'ROOM',
            legacyReservation: {
              isDeleted: false
            }
          },
          { orderType: 'LEGACY' }
        ]
      },
      include: {
        items: { include: { item: true } },
        walkInSession: true,
        legacyReservation: {
          include: {
            room: true,
            guest: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
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
      
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  async getOrderHistory() {
    const orders = await this.prisma.order.findMany({
      where: {
        status: { in: ['PENDING', 'PREPARING', 'SERVED', 'PAID', 'CANCELLED'] },
        isDeleted: false,
        OR: [
          { orderType: 'WALK_IN' },
          {
            orderType: 'ROOM',
            legacyReservation: {
              isDeleted: false
            }
          },
          { orderType: 'LEGACY' }
        ]
      },
      take: 100,
      include: {
        items: { include: { item: true } },
        walkInSession: true,
        
        legacyReservation: {
          include: {
            room: true,
            guest: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Backwards compatibility for old orders that only have roomId
    const roomIds = orders.filter(o => o.roomId && !o.legacyReservation).map(o => o.roomId as string);
    if (roomIds.length > 0) {
      const rooms = await this.prisma.room.findMany({
        where: { id: { in: roomIds } }
      });
      const roomMap = new Map(rooms.map(r => [r.id, r]));
      
      orders.forEach(o => {
        if (o.roomId && !o.legacyReservation) {
          const room = roomMap.get(o.roomId);
          if (room) {
            (o as any).legacyReservation = { room, guest: { firstName: 'Unknown', lastName: 'Guest' } };
          }
        }
      });
    }

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
