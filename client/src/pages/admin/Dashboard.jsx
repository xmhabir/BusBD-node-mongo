import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { adminApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
    LayoutDashboard, Users, Ticket, DollarSign,
    TrendingUp, Lock, Unlock, BarChart3,
    Settings, Loader2, AlertCircle, CalendarRange
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line
} from 'recharts';
import UserSales from './UserSales';
import AdminSchedules from './Schedules';

// Dashboard Overview
function Overview() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const response = await adminApi.getDashboard();
            setData(response.data);
        } catch (error) {
            console.error('Dashboard error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const stats = [
        { label: "Today's Bookings", value: data?.stats?.todayBookings || 0, icon: Ticket, color: 'bg-blue-500' },
        { label: 'Monthly Revenue', value: `৳${(data?.stats?.monthlyRevenue || 0).toLocaleString()}`, icon: DollarSign, color: 'bg-green-500' },
        { label: 'Active Trips', value: data?.stats?.activeTrips || 0, icon: TrendingUp, color: 'bg-purple-500' },
        { label: 'Total Operators', value: data?.stats?.totalOperators || 0, icon: Users, color: 'bg-orange-500' },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Dashboard</h1>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <Card key={stat.label}>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                                </div>
                                <div className={`p-3 rounded-full ${stat.color}`}>
                                    <stat.icon className="h-5 w-5 text-white" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue by Operator */}
                <Card>
                    <CardHeader>
                        <CardTitle>Revenue by Operator</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data?.revenueByOperator?.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={data.revenueByOperator}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="operatorName" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="totalRevenue" fill="hsl(var(--primary))" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                No revenue data available
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Popular Routes */}
                <Card>
                    <CardHeader>
                        <CardTitle>Popular Routes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data?.popularRoutes?.length > 0 ? (
                            <div className="space-y-4">
                                {data.popularRoutes.map((route, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">{route.route}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {route.bookingCount} bookings
                                            </p>
                                        </div>
                                        <p className="font-semibold text-primary">৳{route.revenue}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                                No route data available
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// Lock Management
function LockManagement() {
    const [tripId, setTripId] = useState('');
    const [seatNumber, setSeatNumber] = useState('');
    const [locks, setLocks] = useState([]);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const fetchLocks = async () => {
        if (!tripId) return;
        setLoading(true);
        try {
            const response = await adminApi.getLocks(tripId);
            setLocks(response.data.locks || []);
        } catch (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleForceUnlock = async () => {
        if (!tripId || !seatNumber) {
            toast({ title: 'Error', description: 'Trip ID and Seat Number required', variant: 'destructive' });
            return;
        }
        try {
            await adminApi.forceUnlock(tripId, seatNumber);
            toast({ title: 'Success', description: `Seat ${seatNumber} force unlocked` });
            fetchLocks();
        } catch (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    const handleClearAll = async () => {
        if (!tripId || !confirm('Clear all locks for this trip?')) return;
        try {
            const response = await adminApi.clearLocks(tripId);
            toast({ title: 'Success', description: `Cleared ${response.clearedCount} locks` });
            setLocks([]);
        } catch (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Lock Management</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Force Unlock Seat</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium">Trip ID</label>
                            <Input
                                placeholder="Enter Trip ID"
                                value={tripId}
                                onChange={(e) => setTripId(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Seat Number</label>
                            <Input
                                placeholder="e.g., A1"
                                value={seatNumber}
                                onChange={(e) => setSeatNumber(e.target.value)}
                            />
                        </div>
                        <div className="flex items-end gap-2">
                            <Button onClick={handleForceUnlock} variant="destructive">
                                <Unlock className="h-4 w-4 mr-2" />
                                Force Unlock
                            </Button>
                            <Button onClick={fetchLocks} variant="outline">
                                View Locks
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {locks.length > 0 && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Active Locks for Trip</CardTitle>
                        <Button onClick={handleClearAll} variant="destructive" size="sm">
                            Clear All
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {locks.map((lock) => (
                                <div key={lock.seatNumber} className="flex items-center justify-between p-3 bg-muted rounded">
                                    <div>
                                        <span className="font-medium">Seat {lock.seatNumber}</span>
                                        <span className="text-sm text-muted-foreground ml-4">
                                            Locked by: {lock.userId}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm">TTL: {lock.ttl}s</span>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                setSeatNumber(lock.seatNumber);
                                                handleForceUnlock();
                                            }}
                                        >
                                            Unlock
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// Main Dashboard Component
export default function AdminDashboard() {
    const { isAdmin, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isAdmin) {
        return <Navigate to="/" replace />;
    }


    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-14">
            {/* Main Content */}
            <main className="max-w-[98%] mx-auto px-6 pb-8">
                <Routes>
                    <Route index element={<Overview />} />
                    <Route path="schedules" element={<AdminSchedules />} />
                    <Route path="locks" element={<LockManagement />} />
                    <Route path="sales" element={<UserSales />} />
                    <Route path="analytics" element={<Overview />} />
                </Routes>
            </main>
        </div>
    );
}
