import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, Table, UserCog, LogOut, Menu, X, User } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { profile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Input Data', href: '/input', icon: PlusCircle },
    { name: 'Table View', href: '/table', icon: Table },
  ];

  if (profile?.role === 'admin') {
    navigation.push({ name: 'Admin Panel', href: '/admin', icon: UserCog });
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const NavContent = () => (
    <div className="flex flex-col h-full py-6">
      <div className="px-6 mb-8">
        <h1 className="text-2xl font-bold text-primary tracking-tight">ApplyWork</h1>
        <p className="text-xs text-muted-foreground">Job Application Tracker</p>
      </div>
      
      <nav className="flex-1 px-4 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 mt-auto">
        <div className="p-4 bg-muted rounded-xl mb-4">
          <div className="flex items-center mb-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{profile?.displayName || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">
            Subscription Status
          </div>
          {profile?.isSubscribed ? (
            <div className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100">
              Active Subscriber
            </div>
          ) : (
            <div className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-100">
              Trial: {profile?.trialEndsAt.toDate().toLocaleDateString()}
            </div>
          )}
        </div>
        
        <Button 
          variant="ghost" 
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-card">
        <NavContent />
      </aside>

      {/* Mobile Sidebar */}
      <div className="md:hidden">
        <header className="fixed top-0 left-0 right-0 h-16 border-b bg-background/80 backdrop-blur-md z-40 px-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary">ApplyWork</h1>
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
        </header>

        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-72">
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto pt-16 md:pt-0">
          <div className="container max-w-7xl mx-auto p-4 md:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
