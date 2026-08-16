"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Hotel, Users } from "lucide-react";
import api from "@/lib/api";

export function NewOrderDialog({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [walkIns, setWalkIns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [roomsRes, walkInsRes] = await Promise.all([
        api.get("/rooms/checked-in"),
        api.get("/walk-in/active")
      ]);
      setRooms(roomsRes.data || []);
      setWalkIns(walkInsRes.data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSelectRoom = (roomId: string, roomNum: string) => {
    setOpen(false);
    router.push(`/pos/menu?orderType=ROOM&roomId=${roomId}&label=Room ${roomNum}`);
  };

  const handleSelectWalkIn = (walkInId: string, ref: string, name: string) => {
    setOpen(false);
    router.push(`/pos/menu?orderType=WALK_IN&walkInId=${walkInId}&label=${encodeURIComponent(`Walk-In: ${name}`)}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl min-h-[60vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Start New Order</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="rooms" className="flex-1 mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="rooms">
              <Hotel className="mr-2 h-4 w-4" /> Checked-In Rooms
            </TabsTrigger>
            <TabsTrigger value="walkin">
              <Users className="mr-2 h-4 w-4" /> Active Walk-Ins
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rooms" className="mt-4 flex-1 overflow-y-auto max-h-[50vh]">
            {loading ? (
              <p className="text-center text-muted-foreground mt-8">Loading rooms...</p>
            ) : rooms.length === 0 ? (
              <p className="text-center text-muted-foreground mt-8">No rooms currently checked in.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {rooms.map((room) => (
                  <Card 
                    key={room.id} 
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => handleSelectRoom(room.id, room.number)}
                  >
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-lg">Room {room.number}</div>
                        <div className="text-sm text-muted-foreground">
                          {room.reservations?.[0]?.guest?.firstName} {room.reservations?.[0]?.guest?.lastName}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">Select</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="walkin" className="mt-4 flex-1 overflow-y-auto max-h-[50vh]">
            {loading ? (
              <p className="text-center text-muted-foreground mt-8">Loading walk-ins...</p>
            ) : walkIns.length === 0 ? (
              <p className="text-center text-muted-foreground mt-8">No active walk-in sessions.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {walkIns.map((session) => (
                  <Card 
                    key={session.id} 
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => handleSelectWalkIn(session.id, session.referenceNumber, session.guestName)}
                  >
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-lg">{session.guestName}</div>
                        <div className="text-sm text-muted-foreground">
                          {session.referenceNumber} - {session.guestCount} Guest(s)
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">Select</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
