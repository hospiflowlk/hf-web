import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Hotel, Users, ReceiptText, History } from "lucide-react";
import Link from "next/link";
import { NewOrderDialog } from "@/components/pos/NewOrderDialog";

export default function PosHubPage() {
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">POS Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        <NewOrderDialog>
          <Card className="hover:bg-accent transition-colors cursor-pointer h-full border-primary/50 border-2">
            <CardHeader className="text-center pb-2">
              <PlusCircle className="w-12 h-12 mx-auto text-primary mb-2" />
              <CardTitle className="text-xl">New Order</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-muted-foreground">
              Start a new order for a room or walk-in guest.
            </CardContent>
          </Card>
        </NewOrderDialog>

        <Link href="/pos/active">
          <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
            <CardHeader className="text-center pb-2">
              <ReceiptText className="w-12 h-12 mx-auto text-purple-500 mb-2" />
              <CardTitle className="text-xl">Kitchen Dashboard</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-muted-foreground">
              Manage food preparation states for orders.
            </CardContent>
          </Card>
        </Link>

        <Link href="/pos/history">
          <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
            <CardHeader className="text-center pb-2">
              <History className="w-12 h-12 mx-auto text-teal-500 mb-2" />
              <CardTitle className="text-xl">Order History</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-muted-foreground">
              View past orders and settlements.
            </CardContent>
          </Card>
        </Link>

        <Link href="/pos/rooms">
          <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
            <CardHeader className="text-center pb-2">
              <Hotel className="w-12 h-12 mx-auto text-blue-500 mb-2" />
              <CardTitle className="text-xl">Room Guests</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-muted-foreground">
              Manage currently checked-in rooms.
            </CardContent>
          </Card>
        </Link>

        <Link href="/pos/walk-ins">
          <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
            <CardHeader className="text-center pb-2">
              <Users className="w-12 h-12 mx-auto text-orange-500 mb-2" />
              <CardTitle className="text-xl">Walk-In Sessions</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-muted-foreground">
              Manage active restaurant walk-in tables.
            </CardContent>
          </Card>
        </Link>

      </div>
    </div>
  );
}
