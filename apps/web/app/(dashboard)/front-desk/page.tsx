"use client";

import { useEffect, useState } from "react";
import { format, addDays, differenceInDays, startOfDay, parseISO } from "date-fns";
import { ChevronDown, Share2, Plus, Calendar, Video, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import api from "@/lib/api";

import { useFrontDesk } from "./hooks/useFrontDesk";
import { ReservationFormModal } from "./components/ReservationFormModal";

export default function FrontDeskPage() {
  const [isResModalOpen, setIsResModalOpen] = useState(false);
  const {
    startDate, setStartDate, endDate, daysToShow, changeGridDays,
    tab, setTab, dayUse, setDayUse, search, setSearch,
    categories, reservations, stats, isLoading,
    nextPeriod, prevPeriod, fetchGrid
  } = useFrontDesk();

  const colWidth = 120; // width of each day column in px

  const dates = Array.from({ length: daysToShow }).map((_, i) => addDays(startDate, i));

  // Helper to calculate reservation block position
  const getBlockStyle = (checkIn: string, checkOut: string) => {
    const ci = parseISO(checkIn);
    const co = parseISO(checkOut);
    
    // Calculate start position relative to grid start
    const startDiff = differenceInDays(ci, startDate);
    const endDiff = differenceInDays(co, startDate);
    
    // Clamp to grid view
    const visibleStart = Math.max(0, startDiff);
    const visibleEnd = Math.min(daysToShow, endDiff);
    
    const left = visibleStart * colWidth;
    const width = (visibleEnd - visibleStart) * colWidth;

    return { left: `${left}px`, width: `${width}px` };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-[#89CFF0] border-[#6CB4EE] text-gray-800'; // Light blue
      case 'TENTATIVE': return 'bg-[#FDFD96] border-[#FCE883] text-gray-800'; // Light yellow
      case 'CHECKED_IN': return 'bg-[#77DD77] border-[#66CC66] text-white'; // Light green
      default: return 'bg-gray-200 border-gray-300 text-gray-800';
    }
  };

  return (
    <div className="h-full flex flex-col bg-white -m-6 md:-m-8">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-50 rounded-md p-1 border border-gray-200">
            {['Front Desk', 'Arrival', 'Departure', 'In House', 'All'].map(t => (
              <button 
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 shadow-sm rounded text-sm font-medium ${tab === t ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
              >
                {t}
              </button>
            ))}
          </div>
          <SelectAllDropdown />
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-9 w-9 border-gray-200 text-gray-500"><Video className="h-4 w-4" /></Button>
          <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">🤖</div>
            Hunt Nearest Hotel Rates
          </span>
          <Button variant="outline" className="h-9 border-gray-200 bg-gray-900 text-white hover:bg-gray-800 hover:text-white">
            <Share2 className="w-4 h-4 mr-2" /> Share
          </Button>
          <Button className="h-9 bg-gray-900 text-white hover:bg-gray-800" onClick={() => setIsResModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Reservation
          </Button>
          <Button className="h-9 bg-gray-900 text-white hover:bg-gray-800">
            Business Block
          </Button>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-white text-sm">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevPeriod}><Clock className="w-4 h-4" /></Button>
          <div className="font-semibold px-3 py-1 bg-gray-50 border border-gray-200 rounded">
            {format(startDate, 'dd MMM yyyy')} – {format(endDate, 'dd MMM yyyy')}
          </div>
          <Button variant="outline" size="icon" className="h-8 w-8 text-gray-400" onClick={nextPeriod}>→</Button>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-600">Day Use</span>
            <Switch checked={dayUse} onCheckedChange={setDayUse} />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-600">Grid Days:</span>
            <select 
              className="bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none cursor-pointer"
              value={daysToShow}
              onChange={(e) => changeGridDays(Number(e.target.value))}
            >
              <option value={7}>7 Days</option>
              <option value={15}>15 Days</option>
              <option value={30}>30 Days</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded px-3 py-1">
            <input 
              type="date" 
              className="outline-none bg-transparent cursor-pointer"
              value={format(startDate, 'yyyy-MM-dd')}
              onChange={(e) => setStartDate(parseISO(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Grid Area */}
      <div className="flex-1 overflow-auto flex">
        {/* Left Frozen Column */}
        <div className="w-[300px] flex-shrink-0 border-r border-gray-200 bg-white sticky left-0 z-20 flex flex-col">
          {/* Header Rows */}
          <div className="h-[60px] border-b border-gray-200 flex items-center px-4 text-sm text-gray-500 font-medium">Rooms <ChevronDown className="w-4 h-4 ml-1" /></div>
          <div className="h-[30px] border-b border-gray-200 flex items-center px-4 text-xs text-gray-500"><ChevronDown className="w-3 h-3 mr-1" /> Availability</div>
          <div className="h-[30px] border-b border-gray-200 flex items-center px-4 text-xs text-gray-500">Occupied</div>
          <div className="h-[30px] border-b border-gray-200 flex items-center px-4 text-xs text-gray-500">Occupancy %</div>
          <div className="h-[30px] border-b border-gray-200 flex items-center px-4 text-xs text-gray-500 font-semibold text-gray-700">Total (All)</div>

          {/* Rooms Rows */}
          <div className="flex-1 overflow-y-auto custom-scrollbar no-scrollbar-x">
            {categories.map((cat) => (
              <div key={cat.id}>
                {/* Category Row */}
                <div className="h-[40px] bg-gray-50 border-b border-gray-200 flex items-center px-2 text-sm font-semibold text-gray-800">
                  <ChevronDown className="w-4 h-4 mr-1 text-gray-500" />
                  <span className="truncate" title={cat.name}>{cat.name}</span>
                </div>
                {/* Rooms */}
                {cat.rooms.map((room) => (
                  <div key={room.id} className="h-[40px] border-b border-gray-100 flex items-center px-4 gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                    <span className="text-sm font-medium text-gray-700">Room {room.number}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Timeline */}
        <div className="flex flex-col relative" style={{ width: `${daysToShow * colWidth}px` }}>
          {/* Dates Header */}
          <div className="flex border-b border-gray-200 sticky top-0 z-10 bg-white h-[60px]">
            {dates.map((d, i) => {
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <div key={i} className={`flex flex-col items-center justify-center border-r border-gray-200 text-sm ${isWeekend ? 'bg-red-50 text-red-600' : 'text-gray-800'}`} style={{ width: colWidth }}>
                  <span className="font-medium">{format(d, 'eee')}</span>
                  <span className="font-semibold">{format(d, 'MMM d')}</span>
                </div>
              );
            })}
          </div>

          {/* Availability Rows */}
          <div className="flex border-b border-gray-200 h-[30px]">
            {dates.map((d, i) => {
              const stat = stats.find(s => s.date.startsWith(format(d, 'yyyy-MM-dd'))) || { available: 0 };
              return (
                <div key={i} className="border-r border-gray-200 flex items-center justify-center text-xs text-gray-500 font-medium" style={{ width: colWidth }}>
                  {stat.available}
                </div>
              );
            })}
          </div>
          <div className="flex border-b border-gray-200 h-[30px]">
            {dates.map((d, i) => {
              const stat = stats.find(s => s.date.startsWith(format(d, 'yyyy-MM-dd'))) || { occupied: 0 };
              return (
                <div key={i} className="border-r border-gray-200 flex items-center justify-center text-xs text-gray-500 font-medium" style={{ width: colWidth }}>
                  {stat.occupied}
                </div>
              );
            })}
          </div>
          <div className="flex border-b border-gray-200 h-[30px]">
            {dates.map((d, i) => {
              const stat = stats.find(s => s.date.startsWith(format(d, 'yyyy-MM-dd'))) || { occupancyPercent: 0 };
              return (
                <div key={i} className="border-r border-gray-200 flex items-center justify-center text-xs text-gray-500 font-medium" style={{ width: colWidth }}>
                  {stat.occupancyPercent}%
                </div>
              );
            })}
          </div>
          <div className="flex border-b border-gray-200 h-[30px] bg-gray-50">
            {dates.map((d, i) => {
              const stat = stats.find(s => s.date.startsWith(format(d, 'yyyy-MM-dd'))) || { arrivals: 0, departures: 0, totalRooms: 0 };
              return (
                <div key={i} className="border-r border-gray-200 flex flex-col items-center justify-center text-[10px] font-semibold text-gray-500" style={{ width: colWidth }}>
                  <div className="flex gap-2">
                    <span className="text-green-600">Arr {stat.arrivals}</span>
                    <span className="text-red-500">Dep {stat.departures}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grid Rows */}
          <div className="flex-1 relative">
            {/* Background Grid Lines */}
            <div className="absolute inset-0 flex pointer-events-none z-0">
              {dates.map((_, i) => (
                <div key={i} className={`border-r border-gray-100 h-full ${i % 7 === 5 || i % 7 === 6 ? 'bg-red-50/30' : ''}`} style={{ width: colWidth }} />
              ))}
            </div>

            {/* Content Rows */}
            <div className="relative z-10 flex flex-col">
              {categories.map((cat) => (
                <div key={cat.id} className="flex flex-col">
                  {/* Category Empty Row */}
                  <div className="h-[40px] flex border-b border-gray-200 bg-gray-50/50">
                    {dates.map((d, i) => {
                      // We could calculate occupied per category here, but for now just show total rooms in cat
                      return (
                        <div key={i} className="border-r border-gray-100 flex items-center justify-center text-xs font-medium text-gray-500" style={{ width: colWidth }}>
                          {cat.rooms.length} Rms
                        </div>
                      )
                    })}
                  </div>
                  {/* Room Rows with Reservations */}
                  {cat.rooms.map((room) => {
                    const roomRes = reservations.filter(r => r.roomId === room.id);
                    return (
                      <div key={room.id} className="h-[40px] border-b border-gray-100 relative">
                        {roomRes.map((res) => {
                          const style = getBlockStyle(res.checkIn, res.checkOut);
                          // Don't render if outside view
                          if (parseInt(style.left) >= daysToShow * colWidth || parseInt(style.width) <= 0) return null;
                          return (
                            <div 
                              key={res.id} 
                              className={`absolute top-1 bottom-1 rounded-sm border px-2 flex items-center overflow-hidden whitespace-nowrap text-xs font-medium shadow-sm cursor-pointer hover:brightness-95 transition-all ${getStatusColor(res.status)}`}
                              style={style}
                            >
                              <div className="w-4 h-4 bg-blue-900 text-white rounded-full flex items-center justify-center text-[10px] mr-1.5 font-bold flex-shrink-0">B</div>
                              {res.guest?.firstName} {res.guest?.lastName} — Room {room.number}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend Footer */}
      <div className="h-12 border-t border-gray-200 bg-white flex items-center justify-center gap-4 text-[11px] font-medium text-gray-600 flex-wrap px-4">
        <LegendItem color="bg-[#89CFF0]" label="Confirmed Reservation" />
        <LegendItem color="bg-[#FDFD96]" label="Tentative" />
        <LegendItem color="bg-pink-300" label="Checked-out" />
        <LegendItem color="bg-[#77DD77]" label="Checked-in" />
        <LegendItem color="bg-gray-100" label="Cancelled" />
        <LegendItem color="bg-gray-400" label="No Show" />
        <LegendItem color="bg-purple-600" label="Block" />
        <LegendItem color="bg-slate-800" label="OUT OF ORDER" />
      </div>

      {/* Modals */}
      {isResModalOpen && (
        <ReservationFormModal 
          isOpen={isResModalOpen} 
          onClose={() => setIsResModalOpen(false)} 
          onSuccess={fetchGrid}
          rooms={categories.flatMap(c => c.rooms)}
        />
      )}
    </div>
  );
}

function LegendItem({ color, label }: { color: string, label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      {label}
    </div>
  );
}

function SelectAllDropdown() {
  return (
    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded px-3 py-1.5 cursor-pointer hover:bg-gray-50">
      <span className="text-sm font-medium">All</span>
      <ChevronDown className="w-4 h-4 text-gray-500" />
    </div>
  );
}
