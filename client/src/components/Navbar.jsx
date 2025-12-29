import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
    Bus, User, LogOut, Ticket, LayoutDashboard, Menu, Home,
    Search as SearchIcon, CalendarRange, Lock, DollarSign, BarChart3
} from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export default function Navbar() {
    const { user, isAuthenticated, isAdmin, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const NavLink = ({ to, icon: Icon, children }) => {
        const isActive = location.pathname === to;
        return (
            <Link
                to={to}
                className={cn(
                    "flex items-center gap-2 text-xs font-semibold transition-all duration-300 px-2 py-0.5 rounded-full",
                    isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                )}
                onClick={() => setIsOpen(false)}
            >
                {Icon && <Icon className="w-4 h-4" />}
                {children}
            </Link>
        );
    };

    return (
        <nav className="fixed top-2 left-0 right-0 z-50 container mx-auto px-4">
            <div className="glass-card rounded-xl h-11 flex items-center justify-between px-5 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2 group">
                    <div className="relative">
                        <div className="gradient-primary p-1 rounded-lg text-white shadow-lg shadow-violet-500/30 group-hover:shadow-violet-500/50 transition-all duration-300 group-hover:scale-105">
                            <Bus className="h-4 w-4" />
                        </div>
                        <div className="absolute -inset-2 bg-violet-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-white dark:to-slate-200">
                        BusBD
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center bg-secondary/50 p-1 rounded-full border border-white/20 dark:border-white/10 backdrop-blur-sm">
                    {isAdmin ? (
                        <>
                            <NavLink to="/admin" icon={LayoutDashboard}>Overview</NavLink>
                            <NavLink to="/admin/schedules" icon={CalendarRange}>Schedules</NavLink>
                            <NavLink to="/admin/locks" icon={Lock}>Locks</NavLink>
                            <NavLink to="/admin/sales" icon={DollarSign}>Sales</NavLink>
                            <NavLink to="/admin/analytics" icon={BarChart3}>Analytics</NavLink>
                        </>
                    ) : (
                        <>
                            <NavLink to="/" icon={Home}>Home</NavLink>
                            <NavLink to="/search" icon={SearchIcon}>Search</NavLink>
                            {isAuthenticated && <NavLink to="/my-bookings" icon={Ticket}>My Bookings</NavLink>}
                        </>
                    )}
                </div>

                {/* Auth & Actions */}
                <div className="flex items-center gap-3">
                    <div className="hidden sm:block">
                        <ModeToggle />
                    </div>

                    {isAuthenticated ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="pl-1 pr-3 h-8 rounded-full hover:bg-primary/5 border border-transparent hover:border-primary/10 transition-all group">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform">
                                        <span className="font-bold text-[10px]">{user?.name?.charAt(0).toUpperCase()}</span>
                                    </div>
                                    <span className="ml-1.5 hidden lg:inline font-semibold group-hover:text-primary transition-colors text-[10px]">{user?.name}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl glass-card border-white/20">
                                <div className="px-4 py-3 bg-muted/50 rounded-xl mb-2">
                                    <p className="font-semibold text-sm">{user?.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                                </div>
                                <DropdownMenuItem onClick={() => navigate('/my-bookings')} className="rounded-lg cursor-pointer py-2.5">
                                    <Ticket className="mr-2 h-4 w-4 text-violet-500" />
                                    My Bookings
                                </DropdownMenuItem>
                                {isAdmin && (
                                    <DropdownMenuItem onClick={() => navigate('/admin')} className="rounded-lg cursor-pointer py-2.5">
                                        <LayoutDashboard className="mr-2 h-4 w-4 text-indigo-500" />
                                        Admin Dashboard
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator className="my-1" />
                                <DropdownMenuItem onClick={handleLogout} className="rounded-lg cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/30 py-2.5">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Logout
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" onClick={() => navigate('/login')} className="rounded-full font-medium hover:bg-primary/5 hover:text-primary hidden sm:flex">
                                Login
                            </Button>
                            <Button onClick={() => navigate('/register')} className="rounded-full px-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-500/25 transition-all hover:scale-105">
                                Register
                            </Button>
                        </div>
                    )}

                    {/* Mobile Menu */}
                    <div className="md:hidden">
                        <Sheet open={isOpen} onOpenChange={setIsOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full">
                                    <Menu className="h-6 w-6" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-[300px] glass-card border-none">
                                <div className="flex flex-col gap-6 mt-10">
                                    <div className="flex flex-col gap-2">
                                        {isAdmin ? (
                                            <>
                                                <NavLink to="/admin" icon={LayoutDashboard}>Overview</NavLink>
                                                <NavLink to="/admin/schedules" icon={CalendarRange}>Schedules</NavLink>
                                                <NavLink to="/admin/locks" icon={Lock}>Locks</NavLink>
                                                <NavLink to="/admin/sales" icon={DollarSign}>Sales</NavLink>
                                                <NavLink to="/admin/analytics" icon={BarChart3}>Analytics</NavLink>
                                            </>
                                        ) : (
                                            <>
                                                <NavLink to="/" icon={Home}>Home</NavLink>
                                                <NavLink to="/search" icon={SearchIcon}>Search Buses</NavLink>
                                                {isAuthenticated && <NavLink to="/my-bookings" icon={Ticket}>My Bookings</NavLink>}
                                            </>
                                        )}
                                    </div>
                                    <div className="h-px bg-border/50" />
                                    <div className="flex justify-between items-center px-4">
                                        <span className="text-sm font-medium">Theme</span>
                                        <ModeToggle />
                                    </div>
                                    {!isAuthenticated && (
                                        <div className="flex flex-col gap-2 mt-4">
                                            <Button variant="outline" onClick={() => { setIsOpen(false); navigate('/login'); }} className="w-full rounded-full">
                                                Login
                                            </Button>
                                            <Button onClick={() => { setIsOpen(false); navigate('/register'); }} className="w-full rounded-full gradient-primary">
                                                Register
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </div>
        </nav>
    );
}
