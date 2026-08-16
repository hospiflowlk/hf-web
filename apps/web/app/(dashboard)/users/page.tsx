"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    pin: "",
    role: "USER"
  });

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openModal = (user: any = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        pin: "",
        role: user.role
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: "",
        pin: "",
        role: "USER"
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, {
          name: formData.name,
          role: formData.role,
          ...(formData.pin && { pin: formData.pin })
        });
      } else {
        await api.post('/users', formData);
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert('Error saving user');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to deactivate this user?')) {
      try {
        await api.delete(`/users/${id}`);
        fetchUsers();
      } catch (err) {
        console.error(err);
        alert('Error deactivating user');
      }
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShieldAlert className="w-8 h-8 text-primary" /> User Management
        </h1>
        <Button onClick={() => openModal()}>
          <Plus className="w-4 h-4 mr-2" /> Add User
        </Button>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>
                  <span className="px-2 py-1 rounded bg-gray-100 text-xs font-semibold text-gray-800">
                    {user.role}
                  </span>
                </TableCell>
                <TableCell>
                  {user.isActive ? (
                    <span className="text-green-600 text-sm font-medium">Active</span>
                  ) : (
                    <span className="text-red-600 text-sm font-medium">Inactive</span>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => openModal(user)}>
                    <Pencil className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  {user.isActive && (
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(user.id)}>
                      <Trash2 className="w-4 h-4 mr-1" /> Deactivate
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6 text-gray-500">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label>PIN {editingUser && '(Leave blank to keep current)'}</Label>
              <Input 
                type="password"
                value={formData.pin} 
                onChange={(e) => setFormData({...formData, pin: e.target.value})} 
                placeholder="****"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <select 
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={formData.role} 
                onChange={(e) => setFormData({...formData, role: e.target.value})}
              >
                <option value="USER">User</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
