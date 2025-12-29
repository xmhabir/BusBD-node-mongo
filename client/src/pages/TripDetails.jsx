import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { tripApi } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import SeatMap from '@/components/SeatMap';
import BookingForm from '@/components/BookingForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Clock, MapPin, Bus, Wifi, Smartphone, Tv,
    Snowflake, AlertCircle, Loader2
} from 'lucide-react';
import { format } from 'date-fns';

// ... imports remain same ...

export default function TripDetails() {
    // ... state and hooks remain same ...
    const { id } = useParams();
    const { isAuthenticated } = useAuth();
    const [trip, setTrip] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedSeats, setSelectedSeats] = useState([]);
    const [showBookingForm, setShowBookingForm] = useState(false);

    useEffect(() => {
        fetchTrip();
    }, [id]);

    const fetchTrip = async () => {
        try {
            setLoading(true);
            const response = await tripApi.getById(id);
            setTrip(response.data.trip);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const amenityIcons = {
        wifi: <Wifi className="h-4 w-4" />,
        charging: <Smartphone className="h-4 w-4" />,
        tv: <Tv className="h-4 w-4" />,
        ac: <Snowflake className="h-4 w-4" />
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !trip) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Trip Not Found</h2>
                    <p className="text-muted-foreground">{error || 'Unable to load trip details'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-12 relative overflow-hidden">
            {/* Abstract Background - Consistent with Home */}
            <div className="absolute inset-0 bg-background pointer-events-none">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px]" />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Trip Info & Seat Map */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Trip Header */}
                        <Card className="glass-card border-none">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        {trip.operator?.logo ? (
                                            <img src={trip.operator.logo} alt={trip.operator.name} className="h-16 w-16 rounded-xl object-cover shadow-sm" />
                                        ) : (
                                            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                                                <Bus className="h-8 w-8 text-white" />
                                            </div>
                                        )}
                                        <div>
                                            <CardTitle className="text-2xl">{trip.operator?.name}</CardTitle>
                                            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                                    {trip.bus?.busType}
                                                </span>
                                                • {trip.bus?.busNumber}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-3xl font-bold gradient-text">৳{trip.fare?.base || trip.totalFare}</p>
                                        <p className="text-sm text-muted-foreground">per seat</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between py-6 px-4 bg-muted/30 rounded-xl my-4">
                                    <div className="text-center min-w-[100px]">
                                        <p className="text-2xl font-bold text-primary">{format(new Date(trip.departureTime), 'HH:mm')}</p>
                                        <p className="text-sm font-medium mt-1">{trip.route?.origin}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(trip.departureTime), 'dd MMM')}</p>
                                    </div>
                                    <div className="flex-1 mx-8 relative flex flex-col items-center">
                                        <p className="text-xs text-muted-foreground mb-2">Duration: {trip.duration || '6h 30m'}</p>
                                        <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent relative">
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-1.5 bg-background rounded-full border border-primary/20 shadow-sm">
                                                <Bus className="h-4 w-4 text-primary" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-center min-w-[100px]">
                                        <p className="text-2xl font-bold text-primary">{format(new Date(trip.arrivalTime), 'HH:mm')}</p>
                                        <p className="text-sm font-medium mt-1">{trip.route?.destination}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(trip.arrivalTime), 'dd MMM')}</p>
                                    </div>
                                </div>

                                {/* Amenities */}
                                {trip.bus?.amenities?.length > 0 && (
                                    <div className="flex flex-wrap gap-3 mt-6">
                                        {trip.bus.amenities.map(amenity => (
                                            <span key={amenity} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-full text-sm font-medium hover:bg-muted transition-colors border border-transparent hover:border-border">
                                                {amenityIcons[amenity] || null}
                                                <span className="capitalize">{amenity}</span>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Seat Map */}
                        <div className="glass-card rounded-xl p-1 shadow-xl overflow-hidden">
                            <div className="bg-muted/30 p-4 border-b">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <span className="w-1 h-6 bg-primary rounded-full" />
                                    Select Seats
                                </h3>
                            </div>
                            <div className="p-6">
                                <SeatMap
                                    tripId={id}
                                    seats={trip.seats || []}
                                    seatLayout={trip.bus?.seatLayout}
                                    onSeatsChange={setSelectedSeats}
                                    maxSeats={4}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Booking Summary */}
                    <div className="space-y-6">
                        <Card className="glass-card border-none sticky top-24">
                            <CardHeader className="pb-4 border-b border-border/50">
                                <CardTitle>Booking Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Journey Date</span>
                                        <span className="font-medium">{format(new Date(trip.departureTime), 'dd MMM yyyy')}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Seats Selected</span>
                                        <span className="font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">
                                            {selectedSeats.length}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Seat Numbers</span>
                                        <span className="font-medium">{selectedSeats.length > 0 ? selectedSeats.join(', ') : '-'}</span>
                                    </div>
                                </div>

                                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span>৳{(trip.fare?.base || 0) * selectedSeats.length}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Service Charge</span>
                                        <span>৳0</span>
                                    </div>
                                    <div className="border-t border-border/50 pt-2 flex justify-between font-bold text-lg mt-2">
                                        <span>Total</span>
                                        <span className="text-primary">৳{(trip.fare?.base || 0) * selectedSeats.length}</span>
                                    </div>
                                </div>

                                {selectedSeats.length > 0 ? (
                                    <Button
                                        className="w-full gradient-primary h-12 text-lg shadow-lg shadow-primary/25"
                                        onClick={() => setShowBookingForm(true)}
                                    >
                                        Proceed to Book
                                    </Button>
                                ) : (
                                    <Button disabled className="w-full h-12" variant="outline">
                                        Select a Seat
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                        {/* Cancellation Policy */}
                        <Card className="bg-transparent border border-border/50 shadow-none">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                                    Cancellation Policy
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Free cancellation up to {trip.cancellationPolicy?.cutoffHours || 24} hours before departure.
                                    {trip.cancellationPolicy?.refundPercentage || 80}% refund will be processed automatically.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Floating Action Bar (Mobile/Desktop) */}
                {selectedSeats.length > 0 && !showBookingForm && (
                    <div className="fixed bottom-0 left-0 right-0 p-4 z-40 animate-in slide-in-from-bottom-full duration-300">
                        <div className="container mx-auto">
                            <div className="glass-card bg-background/90 backdrop-blur-xl border-t border-primary/20 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] rounded-2xl p-4 flex items-center justify-between mx-auto max-w-4xl">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-bold text-primary">৳{(trip.fare?.base || 0) * selectedSeats.length}</span>
                                        <span className="text-sm text-muted-foreground">for {selectedSeats.length} seats</span>
                                    </div>
                                    <p className="text-xs text-primary mt-0.5 font-medium flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                        {selectedSeats.join(', ')}
                                    </p>
                                </div>
                                <Button
                                    size="lg"
                                    onClick={() => setShowBookingForm(true)}
                                    className="gradient-primary rounded-xl px-8 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all"
                                >
                                    Proceed to Book
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Booking Form Modal */}
                {showBookingForm && selectedSeats.length > 0 && (
                    <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                        <div className="glass-card bg-background/95 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm flex justify-between items-center p-6 border-b border-border/50">
                                <div>
                                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600">Complete Booking</h2>
                                    <p className="text-sm text-muted-foreground mt-1">Please enter passenger details</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setShowBookingForm(false)} className="rounded-full hover:bg-muted">✕</Button>
                            </div>
                            <BookingForm
                                tripId={id}
                                selectedSeats={selectedSeats}
                                fare={{ base: trip.fare?.base || 0, tax: trip.fare?.tax || 0 }}
                                onSuccess={() => setShowBookingForm(false)}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
