
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { adminApi, api, bookingApi } from '@/services/api'; // Assuming generic api is needed for stations/locations
import { format, isAfter } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Check, ChevronsUpDown, Loader2, Search, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from "@/lib/utils"
import { LOCATIONS } from '@/lib/constants';
import { useToast } from '@/components/ui/use-toast';

import { Separator } from "@/components/ui/separator"; // Keep separator? maybe unused in new layout but good to have.
import SeatMap from '@/components/SeatMap';
import useBookingStore from '@/store/useBookingStore';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Clock, Printer } from "lucide-react";
import { useTripSocket } from '@/hooks/useSocket';

// Printable Ticket Component
const PrintableTicket = ({ booking, schedule }) => {
    if (!booking || !schedule) return null;

    const totalFare = booking.totalAmount || 0;
    const seats = booking.seats || [];

    return (
        <div className="p-8 bg-white text-black font-mono w-[80mm] mx-auto print:m-0 print:w-full">
            <div className="text-center border-b-2 border-black pb-2 mb-4">
                <h1 className="text-xl font-bold uppercase">BusBD Ticket</h1>
                <p className="text-[10px]">{schedule.operator?.name || 'Bus Transport'}</p>
                <p className="text-[10px]">{format(new Date(), 'PPpp')}</p>
            </div>

            <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                    <span className="font-bold">Booking ID:</span>
                    <span>{booking.bookingId}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-bold">Coach:</span>
                    <span>{schedule.bus?.registrationNumber}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-bold">Route:</span>
                    <span>{schedule.route?.origin} - {schedule.route?.destination}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-bold">Departure:</span>
                    <span>{schedule.departureTime ? format(new Date(schedule.departureTime), 'p, MMM d') : 'N/A'}</span>
                </div>
                <div className="border-t border-dashed border-black my-2" />
                <div className="flex justify-between">
                    <span className="font-bold">Passenger:</span>
                    <span>{booking.contactInfo?.name}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-bold">Phone:</span>
                    <span>{booking.contactInfo?.phone}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-bold">Seats:</span>
                    <span className="font-bold">{seats.join(', ')}</span>
                </div>
                <div className="border-t border-dashed border-black my-2" />
                <div className="flex justify-between text-lg font-bold">
                    <span>TOTAL:</span>
                    <span>৳{totalFare}</span>
                </div>
            </div>

            <div className="text-center mt-6 pt-4 border-t border-black">
                <p className="text-[10px]">Thank you for traveling with us!</p>
                <p className="text-[8px] mt-1">Report 15 mins before departure</p>
            </div>
        </div>
    );
};

// Printable Waybill Component
const PrintableWaybill = ({ schedule, bookings }) => {
    if (!schedule) return null;

    const staff = schedule.waybill?.staff || {};
    const issuedAt = schedule.waybill?.issuedAt ? format(new Date(schedule.waybill.issuedAt), 'PPpp') : format(new Date(), 'PPpp');

    return (
        <div className="p-8 bg-white text-black font-sans w-[210mm] mx-auto print:m-0 print:w-full">
            <div className="text-center border-b-2 border-black pb-4 mb-6">
                <h1 className="text-3xl font-bold uppercase tracking-widest">Official Waybill</h1>
                <p className="text-lg font-semibold">{schedule.operator?.name || 'Bus Transport'}</p>
                <p className="text-sm">Issued At: {issuedAt}</p>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8 border-b pb-6">
                <div className="space-y-2">
                    <h3 className="font-bold border-b pb-1 text-blue-800">Vehicle & Trip Info</h3>
                    <div className="flex justify-between"><span>Bus No:</span> <span className="font-semibold">{staff.busNumber || 'N/A'}</span></div>
                    <div className="flex justify-between"><span>Coach No:</span> <span className="font-semibold">{schedule.bus?.registrationNumber || 'N/A'}</span></div>
                    <div className="flex justify-between"><span>Route:</span> <span className="font-semibold">{schedule.route?.origin} - {schedule.route?.destination}</span></div>
                    <div className="flex justify-between"><span>Departure:</span> <span className="font-semibold">{schedule.departureTime ? format(new Date(schedule.departureTime), 'p, MMM d') : 'N/A'}</span></div>
                </div>
                <div className="space-y-2">
                    <h3 className="font-bold border-b pb-1 text-blue-800">Staff Details</h3>
                    <div className="flex justify-between"><span>Driver:</span> <span className="font-semibold">{staff.driver || 'N/A'}</span></div>
                    <div className="flex justify-between"><span>Supervisor:</span> <span className="font-semibold">{staff.supervisor || 'N/A'}</span></div>
                    <div className="flex justify-between"><span>Helper:</span> <span className="font-semibold">{staff.helper || 'N/A'}</span></div>
                </div>
            </div>

            <div className="mb-8">
                <h3 className="font-bold mb-4 text-blue-800 border-b pb-2">Passenger Manifest</h3>
                <table className="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-gray-300 p-2 text-left">Seat</th>
                            <th className="border border-gray-300 p-2 text-left">Passenger Name</th>
                            <th className="border border-gray-300 p-2 text-left">Phone</th>
                            <th className="border border-gray-300 p-2 text-left">Origin</th>
                            <th className="border border-gray-300 p-2 text-left">Dest.</th>
                            <th className="border border-gray-300 p-2 text-left">Pickup</th>
                            <th className="border border-gray-300 p-2 text-right">Fare</th>
                            <th className="border border-gray-300 p-2 text-right">Goods</th>
                            <th className="border border-gray-300 p-2 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bookings?.length > 0 ? bookings.map((b) => (
                            <tr key={b._id}>
                                <td className="border border-gray-300 p-2 font-mono font-bold">{b.seats?.join(', ')}</td>
                                <td className="border border-gray-300 p-2">{b.contactInfo?.name}</td>
                                <td className="border border-gray-300 p-2">{b.contactInfo?.phone}</td>
                                <td className="border border-gray-300 p-2">{b.boardingPoint || schedule.route?.origin}</td>
                                <td className="border border-gray-300 p-2">{b.droppingPoint || schedule.route?.destination}</td>
                                <td className="border border-gray-300 p-2">{b.pickupPlace || '-'}</td>
                                <td className="border border-gray-300 p-2 text-right">{b.pricing?.baseFare || 0}</td>
                                <td className="border border-gray-300 p-2 text-right">{b.goodsFare || 0}</td>
                                <td className="border border-gray-300 p-2 text-right font-bold">{b.totalAmount || 0}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="8" className="border border-gray-300 p-8 text-center text-gray-500">No passengers found for this trip.</td>
                            </tr>
                        )}
                    </tbody>
                    {bookings?.length > 0 && (
                        <tfoot>
                            <tr className="bg-gray-50 font-bold">
                                <td colSpan="6" className="border border-gray-300 p-2 text-right">GRAND TOTAL:</td>
                                <td className="border border-gray-300 p-2 text-right">{bookings.reduce((sum, b) => sum + (b.pricing?.baseFare || 0), 0)}</td>
                                <td className="border border-gray-300 p-2 text-right">{bookings.reduce((sum, b) => sum + (b.goodsFare || 0), 0)}</td>
                                <td className="border border-gray-300 p-2 text-right bg-blue-50">৳{bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0)}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            <div className="mt-16 grid grid-cols-3 gap-8 text-center">
                <div className="border-t border-black pt-2 text-xs uppercase">Operator Signature</div>
                <div className="border-t border-black pt-2 text-xs uppercase">Staff Signature</div>
                <div className="border-t border-black pt-2 text-xs uppercase">Counter Signature</div>
            </div>
        </div>
    );
};

export default function AdminSchedules() {
    const { toast } = useToast();
    // Refs for printing
    const ticketRef = useRef();
    const waybillRef = useRef();
    const [printingBooking, setPrintingBooking] = useState(null);
    const [printingWaybillData, setPrintingWaybillData] = useState(null);

    const handlePrint = useReactToPrint({
        contentRef: ticketRef,
        onAfterPrint: () => setPrintingBooking(null),
    });

    const handlePrintWaybillInternal = useReactToPrint({
        contentRef: waybillRef,
        onAfterPrint: () => setPrintingWaybillData(null),
    });

    const handleFetchAndPrintWaybill = async (id) => {
        try {
            const tripId = id || selectedSchedule?._id;
            if (!tripId) return;

            // Fetch all bookings for this trip
            const { data } = await adminApi.getSales({ tripId, limit: 1000 });
            setPrintingWaybillData(data.sales || []);
        } catch (error) {
            console.error("Failed to fetch waybill data", error);
            toast({
                title: "Print Error",
                description: "Failed to load passenger list for Waybill.",
                variant: "destructive"
            });
        }
    };

    // Trigger Waybill print when data is ready
    useEffect(() => {
        if (printingWaybillData) {
            const timer = setTimeout(() => {
                handlePrintWaybillInternal();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [printingWaybillData, handlePrintWaybillInternal]);

    // Trigger print automatically when printingBooking is set
    useEffect(() => {
        if (printingBooking) {
            const timer = setTimeout(() => {
                handlePrint();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [printingBooking, handlePrint]);
    // State
    const [loading, setLoading] = useState(false);
    const [schedules, setSchedules] = useState([]);

    // Filters
    const [origin, setOrigin] = useState("");
    const [destination, setDestination] = useState("");
    const [coachNumber, setCoachNumber] = useState("");
    const [strictMode, setStrictMode] = useState(false);

    // Filter helpers
    const [openOrigin, setOpenOrigin] = useState(false);
    const [openDestination, setOpenDestination] = useState(false);
    const [locations, setLocations] = useState(LOCATIONS.map(l => l.label).sort());

    // Date Filter State
    const [date, setDate] = useState({ from: undefined, to: undefined }); // Changed to range if needed, or keeping single for now? keeping single based on prev code, but let's stick to single for SEARCH.
    // Actually, previous code had `const [date, setDate] = useState(undefined);`
    // Let's revert to single date for search filter to avoid breaking search logic unnecessarily.
    // Date Filter State
    const [searchDate, setSearchDate] = useState(new Date()); // Default to Today
    const [openSearchDate, setOpenSearchDate] = useState(false);


    // Sheet State
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const { connected } = useTripSocket(selectedSchedule?._id);

    // Store Integration for Persistence
    const selections = useBookingStore(state => state.selections);
    const setSelection = useBookingStore(state => state.setSelection);
    const clearAllSelections = useBookingStore(state => state.clearAllSelections);
    const lastActivity = useBookingStore(state => state.lastActivity);

    // Derived Selection for Current Schedule
    const selectedSeats = selectedSchedule ? (selections[selectedSchedule._id] || []) : [];

    // Helper to mimic setState for compatibility
    // Helper to mimic setState for compatibility
    const setSelectedSeats = useCallback((seats) => {
        if (!selectedSchedule) return;
        const scheduleId = selectedSchedule._id;

        // Access latest state directly to avoid dependency on changing 'selections' or 'selectedSeats'
        const currentRef = useBookingStore.getState().selections[scheduleId] || [];

        const newSeats = typeof seats === 'function' ? seats(currentRef) : seats;

        // Basic equality check to prevent loops if same value
        const isSame = currentRef.length === newSeats.length && currentRef.every(val => newSeats.includes(val));

        if (!isSame) {
            useBookingStore.getState().setSelection(scheduleId, newSeats);
        }
    }, [selectedSchedule]);

    // Timer Logic - DISABLED for Admin Panel
    // Admins need persistent selections without auto-clear

    // Booking State
    const [passengerName, setPassengerName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [passengerEmail, setPassengerEmail] = useState("");
    const [passengerAddress, setPassengerAddress] = useState("");
    const [goodsFare, setGoodsFare] = useState("0");
    const [discountAmount, setDiscountAmount] = useState("0");
    const [boardingPoint, setBoardingPoint] = useState("");
    const [droppingPoint, setDroppingPoint] = useState("");
    const [pickupPlace, setPickupPlace] = useState("");
    const [isBookingLoading, setIsBookingLoading] = useState(false);

    // New Booking Features State
    const [bookingType, setBookingType] = useState('book'); // 'book' | 'sell'
    const [isOverbookDialogOpen, setIsOverbookDialogOpen] = useState(false);
    const [customExpiryDate, setCustomExpiryDate] = useState(new Date());
    const [customExpiryTime, setCustomExpiryTime] = useState("12:00");

    // Waybill State
    const [isWaybillDialogOpen, setIsWaybillDialogOpen] = useState(false);
    const [waybillDriver, setWaybillDriver] = useState("");
    const [waybillSupervisor, setWaybillSupervisor] = useState("");
    const [waybillHelper, setWaybillHelper] = useState("");
    const [waybillBusNumber, setWaybillBusNumber] = useState("");
    const [isWaybillLoading, setIsWaybillLoading] = useState(false);

    const allStops = useMemo(() => {
        if (!selectedSchedule) return [];
        const stops = selectedSchedule.route?.stops || [];
        // Unique names for points
        const points = new Set();
        points.add(selectedSchedule.route?.origin);
        stops.forEach(s => points.add(s.name));
        points.add(selectedSchedule.route?.destination);
        return Array.from(points).filter(Boolean);
    }, [selectedSchedule]);

    // Price Calculation for New Bookings
    const priceSummary = useMemo(() => {
        if (!selectedSchedule || selectedSeats.length === 0) return { baseTotal: 0, extraGoods: 0, discount: 0, serviceFee: 0, grandTotal: 0 };

        let baseFarePerSeat = typeof selectedSchedule.fare === 'object'
            ? (selectedSchedule.fare.base || 0)
            : Number(selectedSchedule.fare) || 0;

        // Dynamic Pricing logic
        if (boardingPoint || droppingPoint) {
            const stops = selectedSchedule.route?.stops || [];
            let bFare = 0;
            let dFare = typeof selectedSchedule.fare === 'object' ? (selectedSchedule.fare.base || 0) : Number(selectedSchedule.fare) || 0;

            if (boardingPoint && boardingPoint !== selectedSchedule.route?.origin) {
                const stop = stops.find(s => s.name === boardingPoint);
                if (stop) bFare = stop.fare || 0;
            }

            if (droppingPoint && droppingPoint !== selectedSchedule.route?.destination) {
                const stop = stops.find(s => s.name === droppingPoint);
                if (stop) dFare = stop.fare || dFare;
            }

            const calculatedFare = Math.abs(dFare - bFare);
            if (calculatedFare > 0) {
                baseFarePerSeat = calculatedFare;
            }
        }

        const tax = typeof selectedSchedule.fare === 'object' ? (selectedSchedule.fare.tax || 0) : 0;
        const disc = typeof selectedSchedule.fare === 'object' ? (selectedSchedule.fare.discount || 0) : 0;

        const fare = baseFarePerSeat + tax - disc;

        const baseTotal = fare * selectedSeats.length;
        const extraGoods = Number(goodsFare) || 0;
        const discount = Number(discountAmount) || 0;
        const serviceFee = Math.round(baseTotal * 0.05); // Matches backend example logic

        return {
            baseTotal,
            extraGoods,
            discount,
            serviceFee,
            grandTotal: baseTotal + extraGoods - discount + serviceFee
        };
    }, [selectedSchedule, selectedSeats, goodsFare, discountAmount, boardingPoint, droppingPoint]);


    // Cancellation State
    const [bookingDetails, setBookingDetails] = useState(null);
    const [isCancelling, setIsCancelling] = useState(false);

    // Fetch booking details when a booked seat is selected
    useEffect(() => {
        if (!selectedSchedule || selectedSeats.length === 0) {
            setBookingDetails(null);
            return;
        }

        const bookedSeat = selectedSchedule.seats?.find(s =>
            s.seatNumber === selectedSeats[0] && (s.status === 'booked' || s.status === 'sold')
        );

        if (bookedSeat && bookedSeat.bookingId) {
            const loadBooking = async () => {
                try {
                    const response = await adminApi.getBooking(bookedSeat.bookingId);
                    setBookingDetails(response.data.booking);
                } catch (error) {
                    console.error("Failed to load booking details", error);
                }
            };
            loadBooking();
        } else {
            setBookingDetails(null);
        }
    }, [selectedSeats, selectedSchedule]);

    const handleCancelBooking = async () => {
        if (!bookingDetails) return;
        // Logic for checking cancel vs reverse sale
        const isSold = bookingDetails.status === 'confirmed';
        const actionText = isSold ? "Reverse Sale" : "Cancel Booking";

        if (!confirm(`Are you sure you want to ${actionText} for ${selectedSeats.length} seat(s)?`)) return;

        setIsCancelling(true);
        try {
            await api.post('/admin/bookings/manage', {
                action: 'cancel',
                bookingId: bookingDetails._id,
                seatNumbers: selectedSeats
            });
            toast({
                title: "Success",
                description: `${actionText} Successful`,
            });

            handleSearch();

            // Refresh currently selected schedule
            try {
                const { tripApi } = await import('@/services/api');
                const response = await tripApi.getById(selectedSchedule._id);
                if (response.data && response.data.trip) {
                    setSelectedSchedule(response.data.trip);
                }
            } catch (error) {
                console.error("Failed to refresh schedule details", error);
            }

            setBookingDetails(null);
            // Clear from store instead of just local state
            if (selectedSchedule?._id) {
                useBookingStore.getState().setSelection(selectedSchedule._id, []);
            }
        } catch (error) {
            console.error("Cancellation failed", error);
            toast({
                title: "Error",
                description: "Failed to cancel: " + (error.response?.data?.message || error.message),
                variant: "destructive"
            });
        } finally {
            setIsCancelling(false);
        }
    };

    // Edit Mode State
    const [isEditingBooking, setIsEditingBooking] = useState(false);
    const [editPassengerName, setEditPassengerName] = useState("");
    const [editPhoneNumber, setEditPhoneNumber] = useState("");
    const [editPassengerEmail, setEditPassengerEmail] = useState("");
    const [editPassengerAddress, setEditPassengerAddress] = useState("");
    const [editBoardingPoint, setEditBoardingPoint] = useState("");
    const [editDroppingPoint, setEditDroppingPoint] = useState("");
    const [editPickupPlace, setEditPickupPlace] = useState("");

    useEffect(() => {
        if (bookingDetails) {
            setEditPassengerName(bookingDetails.contactInfo?.name || "");
            setEditPhoneNumber(bookingDetails.contactInfo?.phone || "");
            setEditPassengerEmail(bookingDetails.contactInfo?.email || "");
            setEditPassengerAddress(bookingDetails.contactInfo?.address || "");
            setEditBoardingPoint(bookingDetails.boardingPoint || "");
            setEditDroppingPoint(bookingDetails.droppingPoint || "");
            setEditPickupPlace(bookingDetails.pickupPlace || "");
        }
        setIsEditingBooking(false);
    }, [bookingDetails]);

    const handleUpdateBooking = async () => {
        if (!bookingDetails) return;
        try {
            const { data } = await api.put(`/admin/bookings/${bookingDetails._id}`, {
                contactInfo: {
                    name: editPassengerName,
                    phone: editPhoneNumber,
                    email: editPassengerEmail,
                    address: editPassengerAddress
                },
                boardingPoint: editBoardingPoint,
                droppingPoint: editDroppingPoint,
                pickupPlace: editPickupPlace
            });
            toast({
                title: "Success",
                description: "Booking updated successfully",
            });
            setBookingDetails(data.data.booking);
            setIsEditingBooking(false);
        } catch (error) {
            console.error("Update failed", error);
            toast({
                title: "Error",
                description: "Failed to update booking",
                variant: "destructive"
            });
        }
    };

    const handleConvertBooking = async () => {
        if (!bookingDetails) return;

        if (!confirm(`Are you sure you want to convert ${selectedSeats.length} seat(s) to Sale?`)) return;

        setIsBookingLoading(true);
        try {
            const response = await api.post('/admin/bookings/manage', {
                action: 'sell',
                bookingId: bookingDetails._id,
                seatNumbers: selectedSeats
            });

            // Auto-print if it was a sale
            if (response.success && response.data?.booking) {
                setPrintingBooking(response.data.booking);
            }

            // Refresh schedule logic
            try {
                const { tripApi } = await import('@/services/api');
                const response = await tripApi.getById(selectedSchedule._id);
                if (response.data && response.data.trip) {
                    setSelectedSchedule(response.data.trip);
                }
            } catch (error) {
                console.error("Failed to refresh schedule details", error);
            }

            setBookingDetails(null);
            // Clear from store instead of just local state
            if (selectedSchedule?._id) {
                useBookingStore.getState().setSelection(selectedSchedule._id, []);
            }
        } catch (error) {
            console.error("Conversion failed", error);
            toast({
                title: "Error",
                description: "Failed to convert: " + (error.response?.data?.message || error.message),
                variant: "destructive"
            });
        } finally {
            setIsBookingLoading(false);
        }
    };


    const handleGenerateWaybill = async () => {
        if (!selectedSchedule || !waybillDriver || !waybillSupervisor) {
            toast({
                title: "Missing Information",
                description: "Driver and Supervisor names are required",
                variant: "destructive"
            });
            return;
        }

        setIsWaybillLoading(true);
        try {
            await api.post(`/admin/schedules/${selectedSchedule._id}/waybill`, {
                driver: waybillDriver,
                supervisor: waybillSupervisor,
                helper: waybillHelper,
                busNumber: waybillBusNumber
            });

            toast({
                title: "Success",
                description: "Waybill generated successfully! Bus is now on the way.",
            });

            // Trigger print automatically
            await handleFetchAndPrintWaybill(selectedSchedule._id);

            // Refresh schedule
            const { tripApi } = await import('@/services/api');
            const response = await tripApi.getById(selectedSchedule._id);
            if (response.data && response.data.trip) {
                setSelectedSchedule(response.data.trip);
            }

            setIsWaybillDialogOpen(false);
        } catch (error) {
            console.error("Waybill generation failed", error);
            toast({
                title: "Error",
                description: "Failed to generate waybill: " + (error.response?.data?.message || error.message),
                variant: "destructive"
            });
        } finally {
            setIsWaybillLoading(false);
        }
    };

    const fetchSchedules = async (filters = {}) => {
        setLoading(true);
        try {
            const params = { limit: 1000, ...filters };
            const response = await adminApi.getSchedules(params);
            const data = response.data;
            setSchedules(data.schedules || []);
        } catch (error) {
            console.error("Failed to fetch schedules", error);
            setSchedules([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        const filters = {};
        if (origin) filters.origin = origin;
        if (destination) filters.destination = destination;
        if (searchDate) filters.date = format(searchDate, 'yyyy-MM-dd');
        if (coachNumber) filters.coachNumber = coachNumber;
        fetchSchedules(filters);
    };

    const handleBookSeats = async (isOverbook = false) => {
        if (!selectedSchedule || selectedSeats.length === 0 || !passengerName || !phoneNumber) return;

        setIsBookingLoading(true);
        try {
            let expiry = null;
            if (isOverbook && bookingType === 'book') {
                // Construct expiry date from date and time inputs
                const [hours, minutes] = customExpiryTime.split(':');
                expiry = new Date(customExpiryDate);
                expiry.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            }

            const bookingPayload = {
                tripId: selectedSchedule._id,
                seats: selectedSeats,
                passengers: selectedSeats.map(seat => ({
                    name: passengerName,
                    seatNumber: seat
                })),
                contactInfo: {
                    name: passengerName,
                    phone: phoneNumber,
                    email: passengerEmail
                },
                address: passengerAddress,
                goodsFare: Number(goodsFare) || 0,
                discount: Number(discountAmount) || 0,
                boardingPoint: boardingPoint || selectedSchedule.route?.origin,
                droppingPoint: droppingPoint || selectedSchedule.route?.destination,
                pickupPlace,
                type: bookingType, // 'book' or 'sell'
                expiry: expiry ? expiry.toISOString() : null
            };

            const response = await import('@/services/api').then(m => m.bookingApi.create(bookingPayload));

            // Auto-print if it was a sale
            if (bookingType === 'sell' && response.success && response.data?.booking) {
                setPrintingBooking(response.data.booking);
            }

            // Small delay to ensure DB updates complete
            await new Promise(resolve => setTimeout(resolve, 500));

            handleSearch();
            try {
                const { tripApi } = await import('@/services/api');
                const response = await tripApi.getById(selectedSchedule._id);
                if (response.data && response.data.trip) {
                    setSelectedSchedule(response.data.trip);
                }
            } catch (error) {
                console.error("Failed to refresh schedule details", error);
            }

            setPassengerName("");
            setPhoneNumber("");
            setPassengerEmail("");
            setPassengerAddress("");
            setGoodsFare("0");
            setDiscountAmount("0");
            setPickupPlace("");
            setIsOverbookDialogOpen(false);

            // Clear from store instead of just local state
            if (selectedSchedule?._id) {
                useBookingStore.getState().setSelection(selectedSchedule._id, []);
            }

        } catch (error) {
            console.error("Booking failed", error);
            toast({
                title: "Error",
                description: "Process Failed: " + (error.message || "Unknown error"),
                variant: "destructive"
            });
        } finally {
            setIsBookingLoading(false);
        }
    };

    return (
        <div className="h-[calc(100vh-1rem)] flex flex-col gap-1">

            {/* Sticky Header: Search & Filter */}
            <div className="sticky top-14 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pb-0 -mx-6 px-6 pt-1">
                <div className="flex flex-col">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        {/* Origin */}
                        <Popover open={openOrigin} onOpenChange={setOpenOrigin}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" size="sm" className="justify-between w-full h-9">
                                    {origin || "Origin..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0">
                                <Command>
                                    <CommandInput placeholder="Search station..." />
                                    <CommandEmpty>No station found.</CommandEmpty>
                                    <CommandGroup>
                                        {locations.map((loc) => (
                                            <CommandItem key={loc} value={loc} onSelect={() => {
                                                setOrigin(origin === loc ? "" : loc);
                                                setOpenOrigin(false);
                                            }}>
                                                <Check className={cn("mr-2 h-4 w-4", origin === loc ? "opacity-100" : "opacity-0")} />
                                                {loc}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </Command>
                            </PopoverContent>
                        </Popover>

                        {/* Destination */}
                        <Popover open={openDestination} onOpenChange={setOpenDestination}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" size="sm" className="justify-between w-full h-9">
                                    {destination || "Destination..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0">
                                <Command>
                                    <CommandInput placeholder="Search station..." />
                                    <CommandEmpty>No station found.</CommandEmpty>
                                    <CommandGroup>
                                        {locations.map((loc) => (
                                            <CommandItem key={loc} value={loc} onSelect={() => {
                                                setDestination(destination === loc ? "" : loc);
                                                setOpenDestination(false);
                                            }}>
                                                <Check className={cn("mr-2 h-4 w-4", destination === loc ? "opacity-100" : "opacity-0")} />
                                                {loc}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </Command>
                            </PopoverContent>
                        </Popover>

                        {/* Date */}
                        <Popover open={openSearchDate} onOpenChange={setOpenSearchDate}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className={cn("justify-between text-left font-normal w-full h-9", !searchDate && "text-muted-foreground")}>
                                    {searchDate ? format(searchDate, "PPP") : <span>Pick a date</span>}
                                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                                <Calendar mode="single" selected={searchDate} onSelect={(d) => { setSearchDate(d); setOpenSearchDate(false); }} initialFocus />
                            </PopoverContent>
                        </Popover>

                        {/* Coach/Search */}
                        <div className="flex space-x-2">
                            <Input
                                placeholder="Coach No."
                                className="h-9"
                                value={coachNumber}
                                onChange={(e) => setCoachNumber(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                            <Button size="sm" className="h-9" onClick={handleSearch}><Search className="h-4 w-4" /></Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Split View Content */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto lg:overflow-hidden min-h-0">

                {/* LEFT: Details & Seat Map */}
                {selectedSchedule && (
                    <Card className="col-span-1 lg:col-span-9 h-fit lg:h-full flex flex-col overflow-hidden border-2 animate-in fade-in slide-in-from-left-4 duration-300">
                        <CardHeader className="py-4 border-b bg-muted/40">
                            <CardTitle className="text-lg">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <span>Coach: {selectedSchedule.bus?.registrationNumber || 'N/A'}</span>
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                try {
                                                    await import('@/services/api').then(m => m.adminApi.clearLocks(selectedSchedule._id));
                                                    const { tripApi } = await import('@/services/api');
                                                    const response = await tripApi.getById(selectedSchedule._id);
                                                    if (response.data && response.data.trip) {
                                                        setSelectedSchedule(response.data.trip);
                                                    }
                                                    alert('Locks cleared successfully');
                                                } catch (err) {
                                                    console.error(err);
                                                    alert('Failed to clear locks');
                                                }
                                            }}
                                        >
                                            Clear Locks
                                        </Button>

                                        {selectedSchedule.waybill?.isGenerated ? (
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 flex items-center gap-1.5"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleFetchAndPrintWaybill(selectedSchedule._id);
                                                    }}
                                                    size="sm"
                                                >
                                                    <Printer className="w-3.5 h-4 w-3.5" />
                                                    Print Waybill
                                                </Button>
                                                <div className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-green-100 text-green-800 text-sm font-semibold border border-green-200 shadow-sm leading-none">
                                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                    Waybill Issued
                                                </div>
                                            </div>
                                        ) : (
                                            <Button
                                                className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 shadow-sm transition-all"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setWaybillDriver("");
                                                    setWaybillSupervisor("");
                                                    setWaybillHelper("");
                                                    setWaybillBusNumber("");
                                                    setIsWaybillDialogOpen(true);
                                                }}
                                            >
                                                <Clock className="w-3.5 h-3.5" />
                                                Issue Waybill
                                            </Button>
                                        )}
                                        <span className="text-sm font-normal text-muted-foreground">
                                            {selectedSchedule.route?.origin} - {selectedSchedule.route?.destination}
                                        </span>
                                    </div>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden p-0">
                            <div className="h-full grid grid-cols-1 lg:grid-cols-5 divide-x">

                                {/* LEFT COLUMN: Seat Map */}
                                <div className="lg:col-span-3 p-2 flex flex-col items-center overflow-y-auto bg-card">
                                    <div className="w-full flex-1 flex gap-2 overflow-hidden">
                                        {/* Left Legend Column (Outside Seat Plan border) */}
                                        <div className="flex flex-col gap-4 py-8 pr-4 min-w-[100px] border-r border-slate-200 dark:border-slate-800">
                                            {/* Connection status */}
                                            <div className="flex items-center gap-2 pl-1 border-l-2 border-green-500 bg-green-50/10 py-1">
                                                <span className="text-[10px] font-black leading-[1.1] text-muted-foreground uppercase tracking-tighter">
                                                    REAL-<br />TIME<br />LIVE
                                                </span>
                                            </div>

                                            <div className="flex flex-col gap-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2.5 h-4 rounded-full border border-slate-400 bg-slate-800" />
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Available</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2.5 h-4 rounded-full bg-violet-600 border border-violet-400" />
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Selected</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2.5 h-4 rounded-full bg-yellow-500 border border-yellow-400" />
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Booked<br />(Temp)</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2.5 h-4 rounded-full bg-red-600 border border-red-400" />
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">My Sold</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2.5 h-4 rounded-full bg-purple-600 border border-purple-400" />
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Sold</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2.5 h-4 rounded-full bg-slate-500 border border-slate-400" />
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Locked</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex-1 flex flex-col h-full overflow-hidden">
                                            <h3 className="mb-2 font-medium text-center text-muted-foreground uppercase tracking-widest text-xs py-2">Seat Plan</h3>
                                            <div className="border rounded-2xl shadow-sm bg-background/50 flex-1 flex flex-col overflow-hidden">
                                                <div className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase">
                                                    <span>{connected ? "Real-time Sync Active" : "Reconnecting..."}</span>
                                                    <div className={cn("w-2 h-2 rounded-full", connected ? "bg-green-500 animate-pulse" : "bg-red-500")} />
                                                </div>
                                                <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
                                                    <SeatMap
                                                        key={selectedSchedule._id}
                                                        tripId={selectedSchedule._id}
                                                        seats={selectedSchedule.seats || []}
                                                        seatLayout={selectedSchedule.bus?.seatLayout}
                                                        onSeatsChange={setSelectedSeats}
                                                        selectedSeats={selectedSeats}
                                                        maxSeats={10}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: Info & Booking Form */}
                                <div className="lg:col-span-2 p-4 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50 flex flex-col gap-4">

                                    {selectedSchedule.waybill?.isGenerated && (
                                        <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-500/50 rounded-xl p-4 animate-pulse">
                                            <div className="flex items-center gap-3 text-amber-700 dark:text-amber-400">
                                                <div className="bg-amber-500 p-2 rounded-full">
                                                    <Clock className="w-5 h-5 text-white" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm uppercase tracking-tight">Warning: Bus on the way</h4>
                                                    <p className="text-[10px] opacity-80">Waybill issued. Cancellations are now locked.</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}


                                    {/* Booking / Management Form */}
                                    <div className="flex-1">
                                        <div className="mb-4">
                                            <h3 className="font-semibold text-lg">
                                                {selectedSeats.length > 0
                                                    ? (bookingDetails ? "Manage Selection" : "Complete Booking")
                                                    : "Select Seats"}
                                            </h3>
                                            <p className="text-muted-foreground text-sm">
                                                {selectedSeats.length > 0
                                                    ? (bookingDetails ? `Managing ${selectedSeats.length} Seat(s)` : `${selectedSeats.length} seat(s) selected`)
                                                    : "Click on seats to select them"}
                                            </p>

                                        </div>

                                        {selectedSeats.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground opacity-50">
                                                <div className="w-16 h-16 mb-4 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>
                                                </div>
                                                <p>Select seats from the map</p>
                                            </div>
                                        ) : bookingDetails ? (
                                            // MANAGE EXISTING BOOKING / SALE
                                            <div className="space-y-6 animate-in fade-in duration-300">
                                                {/* Seat List with Granular Control */}
                                                <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border shadow-sm">
                                                    <h4 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                                                        Selected {selectedSeats.length > 1 ? 'Group' : 'Seat'}
                                                    </h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {selectedSeats.map(seat => (
                                                            <div key={seat} className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border px-2 py-1 rounded-md text-sm font-bold shadow-sm">
                                                                <span>{seat}</span>
                                                                <button
                                                                    onClick={() => {
                                                                        // Optimistic update for UI feel, but actual logic requires re-selection
                                                                        // Since SeatMap isn't fully controlled, we simulate deselection by filtering
                                                                        const newSelection = selectedSeats.filter(s => s !== seat);
                                                                        setSelectedSeats(newSelection);
                                                                    }}
                                                                    className="ml-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full w-4 h-4 flex items-center justify-center transition-colors"
                                                                    title="Remove from selection"
                                                                >
                                                                    ×
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Booking Details Details */}
                                                <div className={cn(
                                                    "p-4 rounded-lg border",
                                                    bookingDetails.status === 'confirmed' || bookingDetails.status === 'sold'
                                                        ? "bg-purple-50 border-purple-100 dark:bg-purple-900/10 dark:border-purple-900/20"
                                                        : "bg-yellow-50 border-yellow-100 dark:bg-yellow-900/10 dark:border-yellow-900/20"
                                                )}>
                                                    <div className="flex justify-between items-start mb-3">
                                                        <span className={cn(
                                                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide",
                                                            bookingDetails.status === 'confirmed' || bookingDetails.status === 'sold'
                                                                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                                                                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
                                                        )}>
                                                            {bookingDetails.status === 'confirmed' ? 'Sold Ticket' : 'Booked Seat'}
                                                        </span>
                                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Edit Details" onClick={() => setIsEditingBooking(!isEditingBooking)}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                                        </Button>
                                                    </div>

                                                    {isEditingBooking ? (
                                                        <div className="space-y-3">
                                                            <div>
                                                                <Label className="text-xs">Name</Label>
                                                                <Input
                                                                    value={editPassengerName}
                                                                    onChange={e => setEditPassengerName(e.target.value)}
                                                                    className="h-8 text-sm"
                                                                />
                                                            </div>
                                                            <div>
                                                                <Label className="text-xs">Phone</Label>
                                                                <Input
                                                                    value={editPhoneNumber}
                                                                    onChange={e => setEditPhoneNumber(e.target.value)}
                                                                    className="h-8 text-sm"
                                                                />
                                                            </div>
                                                            <div>
                                                                <Label className="text-xs">Email</Label>
                                                                <Input
                                                                    value={editPassengerEmail}
                                                                    onChange={e => setEditPassengerEmail(e.target.value)}
                                                                    className="h-8 text-sm"
                                                                />
                                                            </div>
                                                            <div>
                                                                <Label className="text-xs">Address</Label>
                                                                <Input
                                                                    value={editPassengerAddress}
                                                                    onChange={e => setEditPassengerAddress(e.target.value)}
                                                                    className="h-8 text-sm"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <Label className="text-xs">From</Label>
                                                                    <select
                                                                        value={editBoardingPoint}
                                                                        onChange={e => setEditBoardingPoint(e.target.value)}
                                                                        className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                                                                    >
                                                                        {allStops.map(stop => (
                                                                            <option key={stop} value={stop}>{stop}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <Label className="text-xs">To</Label>
                                                                    <select
                                                                        value={editDroppingPoint}
                                                                        onChange={e => setEditDroppingPoint(e.target.value)}
                                                                        className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                                                                    >
                                                                        {allStops.map(stop => (
                                                                            <option key={stop} value={stop}>{stop}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <Label className="text-xs">Pickup Place</Label>
                                                                <Input
                                                                    value={editPickupPlace}
                                                                    onChange={e => setEditPickupPlace(e.target.value)}
                                                                    className="h-8 text-sm"
                                                                />
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <Button size="sm" onClick={handleUpdateBooking}>Save</Button>
                                                                <Button size="sm" variant="outline" onClick={() => setIsEditingBooking(false)}>Cancel</Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2 text-sm">
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">Passenger:</span>
                                                                <span className="font-semibold">{bookingDetails.contactInfo?.name || 'Guest'}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">Mobile:</span>
                                                                <span className="font-mono">{bookingDetails.contactInfo?.phone}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">Email:</span>
                                                                <span className="font-medium truncate max-w-[200px]">{bookingDetails.contactInfo?.email || 'N/A'}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">Address:</span>
                                                                <span className="font-medium truncate max-w-[200px]">{bookingDetails.contactInfo?.address || 'N/A'}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">Route:</span>
                                                                <span className="font-medium">{bookingDetails.boardingPoint} → {bookingDetails.droppingPoint}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">Pickup:</span>
                                                                <span className="font-medium">{bookingDetails.pickupPlace || 'N/A'}</span>
                                                            </div>
                                                            <Separator className="my-1" />
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">Goods Fare:</span>
                                                                <span className="font-bold">৳{bookingDetails.pricing?.goodsFare || 0}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">Discount:</span>
                                                                <span className="font-bold text-red-500">-৳{bookingDetails.pricing?.discount || 0}</span>
                                                            </div>
                                                            <div className="flex justify-between pt-1 border-t mt-1 font-bold text-lg text-emerald-600">
                                                                <span>Total Paid:</span>
                                                                <span>৳{bookingDetails.totalAmount || 0}</span>
                                                            </div>
                                                            {bookingDetails.expiresAt && (
                                                                <div className="flex justify-between text-yellow-700 dark:text-yellow-400 font-medium">
                                                                    <span>Expires:</span>
                                                                    <span>{format(new Date(bookingDetails.expiresAt), 'h:mm a')}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                <div className="grid gap-3 pt-2">
                                                    {(bookingDetails.status === 'booked' || bookingDetails.status === 'reserved') && (
                                                        <Button
                                                            className="w-full bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/20"
                                                            size="lg"
                                                            onClick={handleConvertBooking}
                                                        >
                                                            Convert to Sale
                                                        </Button>
                                                    )}

                                                    <Button
                                                        variant="destructive"
                                                        size="lg"
                                                        className="w-full shadow-md shadow-red-500/20"
                                                        onClick={handleCancelBooking}
                                                        disabled={isCancelling || selectedSchedule.waybill?.isGenerated}
                                                    >
                                                        {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                        {selectedSchedule.waybill?.isGenerated
                                                            ? "Cancellation Locked (Waybill Issued)"
                                                            : (bookingDetails.status === 'confirmed' || bookingDetails.status === 'sold'
                                                                ? 'Cancel Sale (Refund)'
                                                                : 'Cancel Booking (Release)')
                                                        }
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            // NEW BOOKING FORM (Existing Code)
                                            <div className="space-y-3 animate-in fade-in duration-300">
                                                <Tabs value={bookingType} onValueChange={setBookingType} className="w-full">
                                                    <TabsList className="grid w-full grid-cols-2 h-9">
                                                        <TabsTrigger value="book" className="text-xs">Book (Hold)</TabsTrigger>
                                                        <TabsTrigger value="sell" className="text-xs">Sell (Issue)</TabsTrigger>
                                                    </TabsList>
                                                </Tabs>

                                                <div className="space-y-2">
                                                    {/* Selected Seats Tags (As per request) */}
                                                    <div className="bg-slate-100/50 dark:bg-slate-800/50 p-3 rounded-lg border border-dashed">
                                                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Selected Seats</h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {selectedSeats.map(seat => (
                                                                <div key={seat} className="flex items-center gap-1.5 bg-background border px-2 py-1 rounded shadow-sm text-sm font-bold animate-in zoom-in-95 duration-200">
                                                                    <span>{seat}</span>
                                                                    <button
                                                                        onClick={() => setSelectedSeats(prev => prev.filter(s => s !== seat))}
                                                                        className="text-muted-foreground hover:text-red-500 transition-colors"
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2">
                                                        <Button
                                                            variant="outline" size="sm"
                                                            onClick={() => { setPassengerName('Walk-in Guest'); setPhoneNumber('01700000000'); }}
                                                            className="text-xs"
                                                        >
                                                            Walk-in Guest
                                                        </Button>
                                                        <Button
                                                            variant="outline" size="sm"
                                                            onClick={() => { setPassengerName(''); setPhoneNumber(''); }}
                                                            className="text-xs"
                                                        >
                                                            New Customer
                                                        </Button>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1">
                                                            <Label htmlFor="pName" className="text-xs">Passenger Name</Label>
                                                            <Input
                                                                id="pName"
                                                                placeholder="Name"
                                                                value={passengerName}
                                                                onChange={(e) => setPassengerName(e.target.value)}
                                                                className="h-8 text-sm"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label htmlFor="pPhone" className="text-xs">Phone Number</Label>
                                                            <Input
                                                                id="pPhone"
                                                                placeholder="017..."
                                                                value={phoneNumber}
                                                                onChange={(e) => setPhoneNumber(e.target.value)}
                                                                className="h-8 text-sm"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label htmlFor="pEmail" className="text-xs">Email Address</Label>
                                                        <Input
                                                            id="pEmail"
                                                            type="email"
                                                            placeholder="email@example.com"
                                                            value={passengerEmail}
                                                            onChange={(e) => setPassengerEmail(e.target.value)}
                                                            className="h-8 text-sm"
                                                        />
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label htmlFor="pAddress" className="text-xs">Passenger Address</Label>
                                                        <Input
                                                            id="pAddress"
                                                            placeholder="Enter full address"
                                                            value={passengerAddress}
                                                            onChange={(e) => setPassengerAddress(e.target.value)}
                                                            className="h-8 text-sm"
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">Starting Point</Label>
                                                            <select
                                                                className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                                                                value={boardingPoint}
                                                                onChange={(e) => setBoardingPoint(e.target.value)}
                                                            >
                                                                {allStops.map(stop => (
                                                                    <option key={stop} value={stop}>{stop}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">Ending Point</Label>
                                                            <select
                                                                className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                                                                value={droppingPoint}
                                                                onChange={(e) => setDroppingPoint(e.target.value)}
                                                            >
                                                                {allStops.map(stop => (
                                                                    <option key={stop} value={stop}>{stop}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label htmlFor="pPickup" className="text-xs">Pickup Place</Label>
                                                        <Input
                                                            id="pPickup"
                                                            placeholder="Pickup point detail"
                                                            value={pickupPlace}
                                                            onChange={(e) => setPickupPlace(e.target.value)}
                                                            className="h-8 text-sm"
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1">
                                                            <Label htmlFor="pGoods" className="text-xs">Goods (Extra)</Label>
                                                            <Input
                                                                id="pGoods"
                                                                type="number"
                                                                min="0"
                                                                value={goodsFare}
                                                                onChange={(e) => setGoodsFare(e.target.value)}
                                                                className="h-8 text-sm"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label htmlFor="pDiscount" className="text-xs">Discount</Label>
                                                            <Input
                                                                id="pDiscount"
                                                                type="number"
                                                                min="0"
                                                                value={discountAmount}
                                                                onChange={(e) => setDiscountAmount(e.target.value)}
                                                                className="h-8 text-sm"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Real-time Price Summary */}
                                                    <div className="mt-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 space-y-1 shadow-sm animate-in slide-in-from-bottom-2 duration-300">
                                                        <div className="flex justify-between text-[10px] text-muted-foreground">
                                                            <span>Fare ({selectedSeats.length} Seats)</span>
                                                            <span>৳{priceSummary.baseTotal}</span>
                                                        </div>
                                                        {priceSummary.extraGoods > 0 && (
                                                            <div className="flex justify-between text-[10px] text-muted-foreground">
                                                                <span>Goods Fare</span>
                                                                <span>+৳{priceSummary.extraGoods}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between text-[10px] text-muted-foreground">
                                                            <span>Service Fee</span>
                                                            <span>+৳{priceSummary.serviceFee}</span>
                                                        </div>
                                                        {priceSummary.discount > 0 && (
                                                            <div className="flex justify-between text-[10px] text-red-500 font-medium">
                                                                <span>Discount</span>
                                                                <span>-৳{priceSummary.discount}</span>
                                                            </div>
                                                        )}
                                                        <Separator className="bg-emerald-200/50 dark:bg-emerald-800/50" />
                                                        <div className="flex justify-between items-center pt-1">
                                                            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Total Payable</span>
                                                            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">৳{priceSummary.grandTotal}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-4 space-y-2">
                                                    {bookingType === 'book' ? (
                                                        <div className="flex gap-2">
                                                            <Button
                                                                onClick={() => handleBookSeats(false)}
                                                                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white"
                                                                size="lg"
                                                                disabled={isBookingLoading}
                                                            >
                                                                {isBookingLoading ? <Loader2 className="animate-spin" /> : "Book Seats"}
                                                            </Button>

                                                            <Dialog open={isOverbookDialogOpen} onOpenChange={setIsOverbookDialogOpen}>
                                                                <DialogTrigger asChild>
                                                                    <Button variant="secondary" size="lg" className="px-3" title="Overbook">
                                                                        <Clock className="w-5 h-5" />
                                                                    </Button>
                                                                </DialogTrigger>
                                                                <DialogContent>
                                                                    <DialogHeader>
                                                                        <DialogTitle>Overbook Seats</DialogTitle>
                                                                        <DialogDescription>
                                                                            Set a custom expiry time for this booking.
                                                                        </DialogDescription>
                                                                    </DialogHeader>
                                                                    <div className="grid gap-4 py-4">
                                                                        <div className="grid grid-cols-2 gap-4">
                                                                            <div className="space-y-2">
                                                                                <Label>Expiry Date</Label>
                                                                                <Input type="date" value={customExpiryDate} onChange={(e) => setCustomExpiryDate(e.target.value)} />
                                                                            </div>
                                                                            <div className="space-y-2">
                                                                                <Label>Expiry Time</Label>
                                                                                <Input type="time" value={customExpiryTime} onChange={(e) => setCustomExpiryTime(e.target.value)} />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <DialogFooter>
                                                                        <Button onClick={() => handleBookSeats(true)} disabled={isBookingLoading}>
                                                                            Confirm Overbook
                                                                        </Button>
                                                                    </DialogFooter>
                                                                </DialogContent>
                                                            </Dialog>
                                                        </div>
                                                    ) : (
                                                        <Button
                                                            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                                                            size="lg"
                                                            onClick={() => handleBookSeats(false)}
                                                            disabled={isBookingLoading}
                                                        >
                                                            {isBookingLoading ? <Loader2 className="animate-spin" /> : "Sell Tickets (Issue)"}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* RIGHT: Scrollable List ... (Kept same) */}
                <Card className={cn(
                    "flex flex-col overflow-hidden shadow-md transition-all duration-300 ease-in-out",
                    selectedSchedule ? "col-span-1 lg:col-span-3 h-[500px] lg:h-full" : "col-span-1 lg:col-span-12 h-full"
                )}>
                    {/* ... List Content (Optimized to not change much) ... */}
                    <CardHeader className="py-3 px-4 border-b bg-muted/40 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                            Available Schedules
                        </CardTitle>
                        {selectedSchedule && (
                            <Button variant="ghost" size="sm" onClick={() => setSelectedSchedule(null)} className="h-6 text-xs hover:bg-destructive/10 hover:text-destructive">
                                Close Details
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-hidden relative">
                        {loading ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : null}

                        <div className="h-full overflow-y-auto">
                            <div className="divide-y divide-border">
                                {schedules.length > 0 ? (
                                    schedules.map((schedule) => {
                                        const isExpired = schedule.departureTime ? isAfter(new Date(), new Date(schedule.departureTime)) : false;
                                        const hasWaybill = schedule.waybill?.isGenerated;

                                        return (
                                            <div
                                                key={schedule._id}
                                                onClick={async () => {
                                                    // Clear current schedule's selection before switching
                                                    if (selectedSchedule?._id) {
                                                        useBookingStore.getState().setSelection(selectedSchedule._id, []);
                                                        // Small delay to ensure state updates
                                                        await new Promise(resolve => setTimeout(resolve, 0));
                                                    }
                                                    setSelectedSchedule(schedule);
                                                    setBoardingPoint(schedule.route?.origin || "");
                                                    setDroppingPoint(schedule.route?.destination || "");
                                                    setPickupPlace("");
                                                    try {
                                                        const { tripApi } = await import('@/services/api');
                                                        const response = await tripApi.getById(schedule._id);
                                                        if (response.data && response.data.trip) {
                                                            setSelectedSchedule(response.data.trip);
                                                            setBoardingPoint(response.data.trip.route?.origin || "");
                                                            setDroppingPoint(response.data.trip.route?.destination || "");
                                                        }
                                                    } catch (error) {
                                                        console.error("Failed to refresh schedule details", error);
                                                    }
                                                }}
                                                className={cn(
                                                    "p-3 cursor-pointer transition-all border-l-4 relative",
                                                    selectedSchedule?._id === schedule._id
                                                        ? "bg-primary/25 border-l-primary shadow-sm"
                                                        : "hover:bg-muted/50 border-l-transparent hover:border-l-muted-foreground/30",
                                                    isExpired && "opacity-60 grayscale-[0.5] hover:opacity-90 transition-opacity",
                                                    hasWaybill && !isExpired && "border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20"
                                                )}
                                            >
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={cn(
                                                                "font-bold font-mono text-xl tracking-tight leading-none",
                                                                isExpired ? "text-muted-foreground" : "text-primary",
                                                                hasWaybill && "text-emerald-700 dark:text-emerald-400"
                                                            )}>
                                                                {schedule.bus?.registrationNumber || "N/A"}
                                                            </span>
                                                            {hasWaybill && (
                                                                <span className="text-[12px] font-black px-2 py-0.5 rounded bg-emerald-600 text-white uppercase tracking-tighter flex items-center gap-1 shadow-md animate-pulse">
                                                                    <Clock className="w-3 h-3" />
                                                                    WAYBILL ON
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className={cn(
                                                            "text-base font-bold truncate tracking-tight mt-0.5",
                                                            isExpired ? "text-muted-foreground" : "text-foreground"
                                                        )}>
                                                            {schedule.route?.origin} <span className="text-muted-foreground/50 mx-0.5 text-sm">→</span> {schedule.route?.destination}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className={cn(
                                                            "text-sm font-bold px-2 py-0.5 rounded-lg shadow-sm whitespace-nowrap leading-none",
                                                            isExpired ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
                                                        )}>
                                                            {schedule.departureTime ? format(new Date(schedule.departureTime), "p") : "N/A"}
                                                        </span>
                                                        <span className="text-[10px] font-semibold text-muted-foreground mt-0.5">
                                                            {schedule.departureTime ? format(new Date(schedule.departureTime), "MMM d") : ""}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-dashed border-muted">
                                                    <span className={cn(
                                                        "text-xs font-bold flex items-center gap-1",
                                                        isExpired ? "text-muted-foreground opacity-50" : (
                                                            (schedule.availableSeats || 0) < 5 ? "text-red-500" : "text-emerald-600"
                                                        )
                                                    )}>
                                                        <div className={cn(
                                                            "w-1.5 h-1.5 rounded-full",
                                                            isExpired ? "bg-slate-300" : (
                                                                (schedule.availableSeats || 0) < 5 ? "bg-red-500" : "bg-emerald-500"
                                                            )
                                                        )} />
                                                        {schedule.availableSeats} Seats
                                                    </span>
                                                    <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-70">
                                                        {schedule.bus?.busType || 'Standard'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    !loading && (
                                        <div className="p-8 text-center text-muted-foreground text-sm">
                                            No schedules found.
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            {/* Waybill Dialog */}
            <Dialog open={isWaybillDialogOpen} onOpenChange={setIsWaybillDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-amber-500" />
                            Issue Waybill
                        </DialogTitle>
                        <DialogDescription>
                            Enter staff details to finalize the waybill. Once issued, seat cancellations will be restricted.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="driver" className="text-right">Driver</Label>
                            <Input
                                id="driver"
                                value={waybillDriver}
                                onChange={(e) => setWaybillDriver(e.target.value)}
                                className="col-span-3"
                                placeholder="Enter driver name"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="supervisor" className="text-right">Supervisor</Label>
                            <Input
                                id="supervisor"
                                value={waybillSupervisor}
                                onChange={(e) => setWaybillSupervisor(e.target.value)}
                                className="col-span-3"
                                placeholder="Enter supervisor name"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="helper" className="text-right">Helper</Label>
                            <Input
                                id="helper"
                                value={waybillHelper}
                                onChange={(e) => setWaybillHelper(e.target.value)}
                                className="col-span-3"
                                placeholder="Enter helper name (optional)"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="busNumber" className="text-right">Bus No</Label>
                            <Input
                                id="busNumber"
                                value={waybillBusNumber}
                                onChange={(e) => setWaybillBusNumber(e.target.value)}
                                className="col-span-3"
                                placeholder="Enter bus number (e.g. 504)"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsWaybillDialogOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                            onClick={handleGenerateWaybill}
                            disabled={isWaybillLoading || !waybillDriver || !waybillSupervisor}
                        >
                            {isWaybillLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Generate Waybill
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Hidden component for printing - Using off-screen instead of display:none for better library compatibility */}
            <div className="fixed -top-[9999px] -left-[9999px] pointer-events-none opacity-0">
                <div ref={ticketRef}>
                    <PrintableTicket
                        booking={printingBooking}
                        schedule={selectedSchedule}
                    />
                </div>
            </div>

            {/* Hidden component for printing Waybill */}
            <div className="fixed -top-[9999px] -left-[9999px] pointer-events-none opacity-0">
                <div ref={waybillRef}>
                    <PrintableWaybill
                        schedule={selectedSchedule}
                        bookings={printingWaybillData}
                    />
                </div>
            </div>
        </div>
    );
}
