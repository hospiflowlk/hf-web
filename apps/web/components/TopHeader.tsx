"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TopHeader() {
  return (
    <header className="h-16 flex items-center justify-between px-6 bg-card border-b border-border shadow-sm">
      <div className="flex items-center gap-4 lg:hidden">
        <Button variant="ghost" size="icon">
          <Menu className="w-6 h-6" />
        </Button>
        <span className="font-bold text-lg text-primary">HospiFlow</span>
      </div>
      <div className="hidden lg:block">
        {/* Breadcrumbs or Page Title could go here */}
      </div>
      <div className="flex items-center gap-4">
        <div className="text-sm text-right hidden sm:block">
          <p className="font-medium">Property Manager</p>
          <p className="text-muted-foreground text-xs">admin@property.com</p>
        </div>
        <Avatar className="ring-2 ring-accent">
          <AvatarImage src="" />
          <AvatarFallback className="bg-primary text-primary-foreground">PM</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
