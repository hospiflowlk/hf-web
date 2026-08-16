import { useState, useEffect } from 'react';
import { addDays, subDays, startOfDay, differenceInDays, parseISO } from 'date-fns';
import api from '@/lib/api';

export type Guest = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
};

export type Reservation = {
  id: string;
  checkIn: string;
  checkOut: string;
  status: string;
  roomId: string;
  guest?: Guest;
  totalPrice: number;
  notes?: string;
  companyName?: string;
  contactPerson?: string;
};

export type RoomOutOfOrder = {
  id: string;
  roomId: string;
  startDate: string;
  endDate: string;
  reason: string;
  notes?: string;
};

export type Room = {
  id: string;
  number: string;
  status: string;
  outOfOrders: RoomOutOfOrder[];
};

export type RoomCategory = {
  id: string;
  name: string;
  rooms: Room[];
};

export type GridStats = {
  date: string;
  totalRooms: number;
  outOfOrder: number;
  sellable: number;
  occupied: number;
  blocked: number;
  available: number;
  occupancyPercent: number;
  arrivals: number;
  departures: number;
};

export function useFrontDesk() {
  const [startDate, setStartDate] = useState<Date>(startOfDay(new Date()));
  const [daysToShow, setDaysToShow] = useState<number>(15);
  const [tab, setTab] = useState<string>('Front Desk');
  const [dayUse, setDayUse] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  
  const [categories, setCategories] = useState<RoomCategory[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stats, setStats] = useState<GridStats[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const endDate = addDays(startDate, daysToShow);

  const fetchGrid = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/rooms/grid`, {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          tab,
          dayUse,
          search
        }
      });
      setCategories(res.data.categories || []);
      setReservations(res.data.reservations || []);
      setStats(res.data.stats || []);
    } catch (err) {
      console.error('Failed to fetch grid:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGrid();
  }, [startDate, daysToShow, tab, dayUse, search]);

  const nextPeriod = () => setStartDate(addDays(startDate, Math.max(1, Math.floor(daysToShow / 2))));
  const prevPeriod = () => setStartDate(subDays(startDate, Math.max(1, Math.floor(daysToShow / 2))));
  const changeGridDays = (days: number) => setDaysToShow(days);

  return {
    startDate,
    setStartDate,
    endDate,
    daysToShow,
    changeGridDays,
    tab,
    setTab,
    dayUse,
    setDayUse,
    search,
    setSearch,
    categories,
    reservations,
    stats,
    isLoading,
    fetchGrid,
    nextPeriod,
    prevPeriod,
  };
}
