import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { bookingApi } from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
    Ticket, Clock, MapPin, Calendar,
    Loader2, AlertCircle, XCircle, Search
} from 'lucide-react';
import { format } from 'date-fns';

export default function MyBookings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const { toast } = useToast();

    useEffect(() => {
        fetchBookings();
    }, [filter]);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const params = filter !== 'all' ? { status: filter } : {};
            const response = await bookingApi.getAll(params);
            setBookings(response.data.bookings || []);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to load bookings',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (bookingId) => {
        if (!confirm('Are you sure you want to cancel this booking?')) return;

        try {
            await bookingApi.cancel(bookingId, 'User requested cancellation');
            toast({ title: 'Booking Cancelled', description: 'Your booking has been cancelled' });
            fetchBookings();
        } catch (error) {
            toast({
                title: 'Cancellation Failed',
                description: error.message,
                variant: 'destructive'
            });
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'confirmed': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
            case 'pending': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
            case 'cancelled': return 'bg-destructive/10 text-destructive border-destructive/20';
            case 'completed': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
            default: return 'bg-muted text-muted-foreground border-border';
        }
    };

    return (
        <div className="min-h-screen pt-24 pb-12 bg-background relative selection:bg-primary/20">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-b from-violet-500/5 to-transparent pointer-events-none rounded-full blur-3xl" />

            <div className="container mx-auto px-4 relative z-10">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div>
                        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600">My Bookings</h1>
                        <p className="text-muted-foreground mt-2">Manage your upcoming and past journeys</p>
                    </div>

                    <div className="flex bg-muted/50 p-1 rounded-xl backdrop-blur-sm border border-white/10">
                        {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 capitalize ${filter === f
                                        ? 'bg-white shadow-sm text-primary scale-105'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-white/50'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <p className="text-muted-foreground animate-pulse">Loading bookings...</p>
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="text-center py-20 glass-card rounded-3xl border-dashed max-w-2xl mx-auto">
                        <div className="bg-primary/5 p-6 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                            <Ticket className="h-10 w-10 text-primary/40" />
                        </div>
                        <h3 className="text-2xl font-bold mb-3">No bookings found</h3>
                        <p className="text-muted-foreground mb-8 text-lg">You haven't made any bookings yet.</p>
                        <Link to="/">
                            <Button className="gradient-primary h-12 px-8 rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                                <Search className="mr-2 h-4 w-4" />
                                Search Buses
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {bookings.map((booking, idx) => (
                            <Card
                                key={booking._id}
                                className="group border-none shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-md animate-in slide-in-from-bottom-4 fade-in"
                                style={{ animationDelay: `${idx * 100}ms` }}
                            >
                                <CardContent className="p-0">
                                    <div className="flex flex-col md:flex-row">
                                        {/* Status Strip */}
                                        <div className={`w-full md:w-2 h-2 md:h-auto ${booking.status === 'confirmed' ? 'bg-emerald-500' :
                                                booking.status === 'cancelled' ? 'bg-destructive' :
                                                    booking.status === 'completed' ? 'bg-blue-500' :
                                                        'bg-yellow-500'
                                            }`} />

                                        <div className="flex-1 p-6 md:p-8">
                                            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded border border-border">
                                                            #{booking.bookingId.slice(-8).toUpperCase()}
                                                        </span>
                                                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold border uppercase tracking-wider ${getStatusStyle(booking.status)}`}>
                                                            {booking.status}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-xl font-bold mt-2">{booking.tripSchedule?.operator?.name} ({(booking.tripSchedule?.bus?.busType)})</h3>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-3xl font-bold text-primary">৳{booking.totalAmount}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">Total Amount</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-8 p-4 bg-muted/20 rounded-xl border border-white/10">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-background rounded-lg shadow-sm">
                                                        <MapPin className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold">{booking.tripSchedule?.route?.origin}</p>
                                                        <p className="text-xs text-muted-foreground">From</p>
                                                    </div>
                                                </div>
                                                <div className="flex-1 h-px bg-border border-dashed border-t min-w-[50px] hidden sm:block" />
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-background rounded-lg shadow-sm">
                                                        <MapPin className="h-5 w-5 text-indigo-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold">{booking.tripSchedule?.route?.destination}</p>
                                                        <p className="text-xs text-muted-foreground">To</p>
                                                    </div>
                                                </div>
                                                <div className="w-px h-10 bg-border hidden md:block" />
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-background rounded-lg shadow-sm">
                                                        <Calendar className="h-5 w-5 text-violet-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold">
                                                            {booking.tripSchedule?.departureTime && format(new Date(booking.tripSchedule.departureTime), 'dd MMM, HH:mm')}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">Departure</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mt-6 pt-6 border-t border-border/50">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="text-muted-foreground">Passengers:</span>
                                                    <div className="flex -space-x-2">
                                                        {booking.passengers?.map((_, i) => (
                                                            <div key={i} className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-bold">
                                                                {i + 1}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <span className="text-muted-foreground ml-2">• Seats: <span className="text-foreground font-medium">{booking.seats?.join(', ')}</span></span>
                                                </div>

                                                {['pending', 'confirmed'].includes(booking.status) && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleCancel(booking._id)}
                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    >
                                                        <XCircle className="h-4 w-4 mr-2" />
                                                        Cancel Booking
                                                    </Button>
                                                )}
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
    );
}
