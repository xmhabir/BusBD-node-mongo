import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, MapPin, Calendar as CalendarIcon, Users, Bus, Shield, Clock, Check, ChevronsUpDown, ArrowRight, Star } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { LOCATIONS } from '@/lib/constants';



export default function Home() {
    const [searchData, setSearchData] = useState({
        origin: '',
        destination: '',
        date: undefined,
        passengers: 1
    });
    const [openOrigin, setOpenOrigin] = useState(false);
    const [openDestination, setOpenDestination] = useState(false);
    const [openDate, setOpenDate] = useState(false);

    const navigate = useNavigate();

    const handleSearch = (e) => {
        e.preventDefault();
        if (!searchData.origin || !searchData.destination || !searchData.date) return;

        const query = new URLSearchParams({
            origin: locations.find(l => l.value === searchData.origin)?.label || searchData.origin,
            destination: locations.find(l => l.value === searchData.destination)?.label || searchData.destination,
            date: format(searchData.date, 'yyyy-MM-dd'),
            passengers: searchData.passengers
        }).toString();
        navigate(`/search?${query}`);
    };

    const popularRoutes = [
        { from: 'Dhaka', to: 'Chittagong', price: 850, time: '5h 30m', rating: 4.8 },
        { from: 'Dhaka', to: 'Sylhet', price: 700, time: '4h 45m', rating: 4.7 },
        { from: 'Dhaka', to: 'Cox\'s Bazar', price: 1200, time: '8h 00m', rating: 4.9 },
        { from: 'Dhaka', to: 'Rajshahi', price: 600, time: '4h 15m', rating: 4.6 },
    ];

    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section className="relative pt-40 pb-32 px-4 overflow-hidden">
                {/* Abstract Background with deeper gradients */}
                <div className="absolute inset-0 bg-background pointer-events-none">
                    <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-indigo-500/10 rounded-full blur-[130px] opacity-60" />
                    <div className="absolute top-[20%] right-[-10%] w-[800px] h-[600px] bg-violet-600/10 rounded-full blur-[100px] opacity-40 animate-pulse delay-700" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[900px] h-[700px] bg-primary/10 rounded-full blur-[120px] opacity-30" />
                </div>

                <div className="container mx-auto relative z-10">
                    <div className="text-center mb-16 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border border-primary/20 text-primary text-sm font-medium mb-4 shadow-sm hover:scale-105 transition-transform cursor-default">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                            </span>
                            Live Seat Availability
                        </div>

                        <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight leading-none">
                            Discover <br />
                            <span className="gradient-text pb-4 inline-block">Bangladesh</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-light">
                            Premium bus booking experience. Lock your preferred seats in real-time and travel with confidence.
                        </p>
                    </div>

                    {/* Search Form - Floating Glass Card */}
                    <Card className="max-w-4xl mx-auto glass-card border-white/40 dark:border-white/10 shadow-2xl shadow-violet-500/10 overflow-visible relative top-4">
                        <CardContent className="p-8">
                            <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
                                {/* Origin Combobox */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">From</label>
                                    <Popover open={openOrigin} onOpenChange={setOpenOrigin}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={openOrigin}
                                                className="w-full justify-between h-14 bg-white/50 dark:bg-slate-900/50 border-white/20 hover:border-primary/50 hover:bg-white/80 transition-all text-base rounded-xl"
                                            >
                                                {searchData.origin ? (
                                                    <span className="font-semibold">{LOCATIONS.find((l) => l.value === searchData.origin)?.label}</span>
                                                ) : (
                                                    <span className="text-muted-foreground">Select City</span>
                                                )}
                                                <MapPin className="ml-2 h-4 w-4 shrink-0 text-primary opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[220px] p-0 rounded-xl overflow-hidden glass-card">
                                            <Command>
                                                <CommandInput placeholder="Search city..." className="h-11" />
                                                <CommandList>
                                                    <CommandEmpty>No city found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {LOCATIONS.map((location) => (
                                                            <CommandItem
                                                                key={location.value}
                                                                value={location.value}
                                                                onSelect={(currentValue) => {
                                                                    setSearchData(prev => ({ ...prev, origin: currentValue === searchData.origin ? "" : currentValue }));
                                                                    setOpenOrigin(false);
                                                                }}
                                                                className="cursor-pointer aria-selected:bg-primary/10 aria-selected:text-primary py-3"
                                                            >
                                                                <Check className={cn("mr-2 h-4 w-4", searchData.origin === location.value ? "opacity-100" : "opacity-0")} />
                                                                {location.label}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                {/* Destination Combobox */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">To</label>
                                    <Popover open={openDestination} onOpenChange={setOpenDestination}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={openDestination}
                                                className="w-full justify-between h-14 bg-white/50 dark:bg-slate-900/50 border-white/20 hover:border-primary/50 hover:bg-white/80 transition-all text-base rounded-xl"
                                            >
                                                {searchData.destination ? (
                                                    <span className="font-semibold">{LOCATIONS.find((l) => l.value === searchData.destination)?.label}</span>
                                                ) : (
                                                    <span className="text-muted-foreground">Select City</span>
                                                )}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-primary opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[220px] p-0 rounded-xl overflow-hidden glass-card">
                                            <Command>
                                                <CommandInput placeholder="Search city..." className="h-11" />
                                                <CommandList>
                                                    <CommandEmpty>No city found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {LOCATIONS.map((location) => (
                                                            <CommandItem
                                                                key={location.value}
                                                                value={location.value}
                                                                onSelect={(currentValue) => {
                                                                    setSearchData(prev => ({ ...prev, destination: currentValue === searchData.destination ? "" : currentValue }));
                                                                    setOpenDestination(false);
                                                                }}
                                                                className="cursor-pointer aria-selected:bg-primary/10 aria-selected:text-primary py-3"
                                                            >
                                                                <Check className={cn("mr-2 h-4 w-4", searchData.destination === location.value ? "opacity-100" : "opacity-0")} />
                                                                {location.label}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                {/* Date Picker */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Date</label>
                                    <Popover open={openDate} onOpenChange={setOpenDate}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-full justify-between h-14 bg-white/50 dark:bg-slate-900/50 border-white/20 hover:border-primary/50 hover:bg-white/80 transition-all text-base rounded-xl",
                                                    !searchData.date && "text-muted-foreground"
                                                )}
                                            >
                                                {searchData.date ? <span className="font-semibold">{format(searchData.date, "PPP")}</span> : <span>Pick a date</span>}
                                                <CalendarIcon className="mr-2 h-4 w-4 text-primary opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 rounded-xl glass-card overflow-hidden" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={searchData.date}
                                                onSelect={(date) => {
                                                    setSearchData(prev => ({ ...prev, date }));
                                                    setOpenDate(false);
                                                }}
                                                initialFocus
                                                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                                className="p-3"
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-transparent select-none uppercase tracking-wider">Search</label>
                                    <Button type="submit" size="lg" className="h-14 w-full gradient-primary rounded-xl font-bold text-lg hover:scale-[1.02] transition-transform active:scale-95 shadow-xl shadow-violet-500/20">
                                        Search
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Popular Routes */}
            <section className="py-24 px-4 bg-secondary/20">
                <div className="container mx-auto">
                    <div className="flex items-center justify-between mb-12">
                        <div className="space-y-2">
                            <h2 className="text-3xl font-bold tracking-tight">Popular Routes</h2>
                            <p className="text-muted-foreground">Most traveled destinations this week</p>
                        </div>
                        <Button variant="ghost" className="text-primary hover:text-primary/80 hover:bg-primary/10">View all</Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {popularRoutes.map((route) => (
                            <Card
                                key={`${route.from}-${route.to}`}
                                className="group cursor-pointer border-none bg-white dark:bg-slate-900 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
                                onClick={() => {
                                    setSearchData(prev => ({
                                        ...prev,
                                        origin: route.from,
                                        destination: route.to,
                                        date: new Date().toISOString().split('T')[0]
                                    }));
                                    navigate(`/search?origin=${route.from}&destination=${route.to}&date=${new Date().toISOString().split('T')[0]}&passengers=1`);
                                }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                <CardContent className="p-6 relative">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="bg-primary/10 p-2 rounded-lg text-primary">
                                            <Bus className="h-6 w-6" />
                                        </div>
                                        <div className="flex items-center gap-1 bg-yellow-400/10 text-yellow-600 dark:text-yellow-400 px-2 py-1 rounded-full text-xs font-bold">
                                            <Star className="h-3 w-3 fill-current" />
                                            {route.rating}
                                        </div>
                                    </div>

                                    <div className="space-y-4 mb-6">
                                        <div>
                                            <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">From</div>
                                            <div className="font-bold text-lg">{route.from}</div>
                                        </div>
                                        <div className="h-px bg-border border-dashed border-b" />
                                        <div>
                                            <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">To</div>
                                            <div className="font-bold text-lg">{route.to}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-auto">
                                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {route.time}
                                        </span>
                                        <span className="text-xl font-bold text-primary">৳{route.price}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-32 px-4 overflow-hidden relative">
                <div className="container mx-auto relative z-10">
                    <div className="text-center mb-20 space-y-4">
                        <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-500 to-indigo-500">Why Choose BusBD?</h2>
                        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                            We've reimagined the bus booking experience to be faster, safer, and more enjoyable.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="group p-8 rounded-3xl bg-white/50 dark:bg-slate-900/50 border border-white/20 dark:border-white/5 hover:bg-white/80 transition-all duration-300 hover:shadow-xl hover:-translate-y-2">
                            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg shadow-violet-500/20 group-hover:scale-110 transition-transform duration-300">
                                <Clock className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-center">Real-Time Booking</h3>
                            <p className="text-muted-foreground text-center leading-relaxed">
                                See seats lock in real-time as other users book. No more double-booking errors or stale data.
                            </p>
                        </div>

                        <div className="group p-8 rounded-3xl bg-white/50 dark:bg-slate-900/50 border border-white/20 dark:border-white/5 hover:bg-white/80 transition-all duration-300 hover:shadow-xl hover:-translate-y-2">
                            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-300">
                                <Shield className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-center">Secure Payments</h3>
                            <p className="text-muted-foreground text-center leading-relaxed">
                                Enterprise-grade security for all transactions. We support all major cards and mobile banking.
                            </p>
                        </div>

                        <div className="group p-8 rounded-3xl bg-white/50 dark:bg-slate-900/50 border border-white/20 dark:border-white/5 hover:bg-white/80 transition-all duration-300 hover:shadow-xl hover:-translate-y-2">
                            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-fuchsia-500 to-pink-600 flex items-center justify-center mb-6 shadow-lg shadow-fuchsia-500/20 group-hover:scale-110 transition-transform duration-300">
                                <Bus className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-center">Premium Operators</h3>
                            <p className="text-muted-foreground text-center leading-relaxed">
                                We partner exclusively with top-rated operators to ensure your journey is safe and comfortable.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
