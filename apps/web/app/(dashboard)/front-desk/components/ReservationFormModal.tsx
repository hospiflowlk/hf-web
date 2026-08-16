import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export function ReservationFormModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  rooms
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSuccess: () => void,
  rooms: any[]
}) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    roomId: '',
    checkIn: '',
    checkOut: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/reservations', formData);
      toast.success('Reservation created!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create reservation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Reservation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>First Name</Label>
              <input required className="w-full border p-2 rounded" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label>Last Name</Label>
              <input className="w-full border p-2 rounded" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label>Check-In Date</Label>
              <input type="date" required className="w-full border p-2 rounded" value={formData.checkIn} onChange={e => setFormData({...formData, checkIn: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label>Check-Out Date</Label>
              <input type="date" required className="w-full border p-2 rounded" value={formData.checkOut} onChange={e => setFormData({...formData, checkOut: e.target.value})} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Room</Label>
              <select required className="w-full border p-2 rounded" value={formData.roomId} onChange={e => setFormData({...formData, roomId: e.target.value})}>
                <option value="">Select Room</option>
                {rooms.map(room => (
                  <option key={room.id} value={room.id}>Room {room.number}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
