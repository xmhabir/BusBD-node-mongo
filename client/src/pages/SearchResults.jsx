import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { tripApi } from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Bus, Clock, MapPin, Star, Filter,
    Loader2, AlertCircle, ArrowRight, SlidersHorizontal
} from 'lucide-react';
import { format } from 'date-fns';

export default function SearchResults() {
    const [searchParams] = useSearchParams();
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        busType: '',
        minPrice: '',
        maxPrice: '',
        sortBy: 'departureTime'
    });

    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');
    const date = searchParams.get('date');
    const passengers = searchParams.get('passengers') || 1;

    useEffect(() => {
        if (origin && destination && date) {
            fetchTrips();
        }
    }, [origin, destination, date, passengers]);

    const fetchTrips = async () => {
        try {
            setLoading(true);
            const response = await tripApi.search({ origin, destination, date, passengers });
            setTrips(response.data.trips || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredTrips = trips
        .filter(trip => {
            if (filters.busType && trip.bus?.busType !== filters.busType) return false;
            if (filters.minPrice && trip.fare?.base < parseInt(filters.minPrice)) return false;
            if (filters.maxPrice && trip.fare?.base > parseInt(filters.maxPrice)) return false;
            return true;
        })
        .sort((a, b) => {
            switch (filters.sortBy) {
                case 'price':
                    return (a.fare?.base || 0) - (b.fare?.base || 0);
                case 'rating':
                    return (b.operator?.rating?.average || 0) - (a.operator?.rating?.average || 0);
                default:
                    return new Date(a.departureTime) - new Date(b.departureTime);
            }
        });

    return (
        <div className="min-h-screen pt-24 pb-12 bg-background relative selection:bg-primary/20">
            {/* Background Blobs */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

            <div className="container mx-auto px-4 relative z-10">
                {/* Search Summary */}
                <div className="mb-8 p-6 md:p-8 gradient-primary rounded-3xl shadow-xl shadow-violet-500/20 text-white relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="absolute top-0 right-0 p-12 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 p-16 bg-black/10 rounded-full blur-3xl" />

                    <div className="flex flex-wrap items-center justify-between gap-6 relative z-10">
                        <div className="flex items-center gap-6">
                            <div className="text-center group">
                                <p className="text-2xl md:text-3xl font-bold">{origin}</p>
                                <p className="text-sm text-white/70 uppercase tracking-widest text-[10px] font-medium mt-1 group-hover:text-white transition-colors">Origin</p>
                            </div>
                            <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                                <ArrowRight className="h-6 w-6 text-white" />
                            </div>
                            <div className="text-center group">
                                <p className="text-2xl md:text-3xl font-bold">{destination}</p>
                                <p className="text-sm text-white/70 uppercase tracking-widest text-[10px] font-medium mt-1 group-hover:text-white transition-colors">Destination</p>
                            </div>
                        </div>
                        <div className="text-right border-l border-white/20 pl-6 hidden md:block">
                            <p className="text-xl font-semibold">{format(new Date(date), 'EEEE, dd MMM')}</p>
                            <p className="text-sm text-white/70 mt-1">{passengers} Passenger(s)</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Filters Sidebar */}
                    <div className="lg:col-span-1">
                        <Card className="glass-card sticky top-24 border-none shadow-lg">
                            <CardContent className="p-6">
                                <h3 className="font-semibold mb-6 flex items-center gap-2 text-lg">
                                    <SlidersHorizontal className="h-5 w-5 text-primary" />
                                    Filters
                                </h3>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Bus Type</label>
                                        <select
                                            className="w-full h-11 px-3 rounded-xl border border-input bg-background/50 hover:bg-background transition-colors focus:ring-2 focus:ring-primary/20 outline-none"
                                            value={filters.busType}
                                            onChange={(e) => setFilters(prev => ({ ...prev, busType: e.target.value }))}
                                        >
                                            <option value="">All Types</option>
                                            <option value="AC">AC</option>
                                            <option value="Non-AC">Non-AC</option>
                                            <option value="Sleeper">Sleeper</option>
                                            <option value="Semi-Sleeper">Semi-Sleeper</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Price</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input
                                                type="number"
                                                placeholder="Min"
                                                className="h-11 rounded-xl bg-background/50"
                                                value={filters.minPrice}
                                                onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                                            />
                                            <Input
                                                type="number"
                                                placeholder="Max"
                                                className="h-11 rounded-xl bg-background/50"
                                                value={filters.maxPrice}
                                                onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Sort By</label>
                                        <select
                                            className="w-full h-11 px-3 rounded-xl border border-input bg-background/50 hover:bg-background transition-colors focus:ring-2 focus:ring-primary/20 outline-none"
                                            value={filters.sortBy}
                                            onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                                        >
                                            <option value="departureTime">Departure Time</option>
                                            <option value="price">Price: Low to High</option>
                                            <option value="rating">Rating: High to Low</option>
                                        </select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Results */}
                    <div className="lg:col-span-3">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                <p className="text-muted-foreground animate-pulse">Searching for best routes...</p>
                            </div>
                        ) : error ? (
                            <div className="text-center py-20 bg-destructive/5 rounded-3xl border border-destructive/20">
                                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                                <p className="text-lg font-medium text-destructive">{error}</p>
                            </div>
                        ) : filteredTrips.length === 0 ? (
                            <div className="text-center py-20 glass-card rounded-3xl border-dashed">
                                <div className="bg-muted p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                                    <Bus className="h-10 w-10 text-muted-foreground" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">No buses found</h3>
                                <p className="text-muted-foreground max-w-sm mx-auto">
                                    We couldn't find any trips matching your criteria. Try changing the date or filters.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between px-2">
                                    <p className="text-sm font-medium text-muted-foreground">
                                        Showing {filteredTrips.length} available bus(es)
                                    </p>
                                </div>

                                {filteredTrips.map((trip, idx) => (
                                    <Card
                                        key={trip._id}
                                        className="group border-none shadow-sm hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 overflow-hidden bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm animate-in slide-in-from-bottom-4 fade-in"
                                        style={{ animationDelay: `${idx * 100}ms` }}
                                    >
                                        <CardContent className="p-0">
                                            <div className="flex flex-col md:flex-row">
                                                {/* Left: Info */}
                                                <div className="flex-1 p-6 md:p-8 space-y-6">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 flex items-center justify-center border border-primary/10">
                                                                <Bus className="h-7 w-7 text-primary" />
                                                            </div>
                                                            <div>
                                                                <h3 className="font-bold text-lg">{trip.operator?.name}</h3>
                                                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                                    <span className="bg-secondary px-2 py-0.5 rounded text-xs font-medium border border-border">
                                                                        {trip.bus?.busType}
                                                                    </span>
                                                                    {trip.operator?.rating?.average > 0 && (
                                                                        <span className="flex items-center gap-1 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400 px-2 py-0.5 rounded text-xs font-bold">
                                                                            <Star className="h-3 w-3 fill-current" />
                                                                            {trip.operator.rating.average.toFixed(1)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right md:hidden">
                                                            <p className="text-2xl font-bold text-primary">৳{trip.fare?.base}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between gap-4 md:gap-12 relative">
                                                        {/* Timeline Line */}
                                                        <div className="absolute top-1/2 left-0 right-0 h-px bg-border border-dashed border-b -z-10 hidden md:block" />

                                                        <div className="text-center bg-background px-2 relative z-0">
                                                            <p className="text-xl font-bold text-foreground">
                                                                {format(new Date(trip.departureTime), 'HH:mm')}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground font-medium mt-1">{trip.route?.origin}</p>
                                                        </div>

                                                        <div className="flex flex-col items-center bg-background px-2 z-0">
                                                            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded-full mb-1">
                                                                <Clock className="h-3 w-3" />
                                                                <span>6h 30m</span>
                                                            </div>
                                                        </div>

                                                        <div className="text-center bg-background px-2 relative z-0">
                                                            <p className="text-xl font-bold text-foreground">
                                                                {format(new Date(trip.arrivalTime), 'HH:mm')}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground font-medium mt-1">{trip.route?.destination}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right: Price & CTA */}
                                                <div className="md:w-64 bg-secondary/10 dark:bg-secondary/5 border-t md:border-t-0 md:border-l border-border p-6 md:p-8 flex flex-col justify-center items-center gap-4 text-center">
                                                    <div className="hidden md:block">
                                                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Price per seat</p>
                                                        <p className="text-3xl font-bold text-primary">৳{trip.fare?.base}</p>
                                                    </div>

                                                    <div className="w-full space-y-3">
                                                        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 py-1 rounded-full">
                                                            {trip.availableSeats} seats available
                                                        </p>
                                                        <Link to={`/trip/${trip._id}`} className="block w-full">
                                                            <Button className="w-full gradient-primary shadow-lg shadow-primary/20 hover:shadow-primary/40 h-12 rounded-xl text-base font-semibold group-hover:scale-105 transition-transform">
                                                                Select Seats
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
