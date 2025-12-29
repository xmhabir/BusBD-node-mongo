import { useState, useEffect, useRef } from 'react';
import { adminApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Printer, Search, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { useReactToPrint } from 'react-to-print';

// Printable Component
const PrintableReport = ({ sales, dateRange }) => {
    const totalAmount = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);

    return (
        <div className="p-8 bg-white text-black print-content">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold">BusBD Sales Report</h1>
                <p className="text-sm text-gray-500">Generated on {format(new Date(), 'PPpp')}</p>
                {dateRange.start && dateRange.end && (
                    <p className="text-sm border p-1 inline-block mt-2 rounded">
                        Period: {format(new Date(dateRange.start), 'PP')} - {format(new Date(dateRange.end), 'PP')}
                    </p>
                )}
            </div>

            <table className="w-full text-sm border-collapse">
                <thead>
                    <tr className="border-b-2 border-black">
                        <th className="text-left py-2">Date</th>
                        <th className="text-left py-2">Booking ID</th>
                        <th className="text-left py-2">Customer</th>
                        <th className="text-left py-2">Route</th>
                        <th className="text-left py-2">Seats</th>
                        <th className="text-right py-2">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {sales.map((sale) => (
                        <tr key={sale._id} className="border-b border-gray-200">
                            <td className="py-2">{format(new Date(sale.createdAt), 'yyyy-MM-dd HH:mm')}</td>
                            <td className="py-2">{sale.bookingId}</td>
                            <td className="py-2">
                                <div>{sale.contactInfo?.name}</div>
                                <div className="text-xs text-gray-400">{sale.contactInfo?.phone}</div>
                            </td>
                            <td className="py-2">
                                <div>{sale.tripSchedule?.route?.origin} - {sale.tripSchedule?.route?.destination}</div>
                                <div className="text-xs text-gray-400">{sale.operator?.name}</div>
                            </td>
                            <td className="py-2">{sale.seats.join(', ')}</td>
                            <td className="py-2 text-right">৳{sale.totalAmount}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="border-t-2 border-black font-bold">
                        <td colSpan="5" className="py-4 text-right">Total Revenue:</td>
                        <td className="py-4 text-right">৳{totalAmount}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
};

export default function UserSales() {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        search: '' // Ideally backend should support search, but for now we filter client side or just use it for userId if backend supports
    });
    const { toast } = useToast();
    const componentRef = useRef();

    const fetchSales = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;

            const response = await adminApi.getSales(params);
            setSales(response.data.sales);
        } catch (error) {
            console.error('Sales fetch error:', error);
            toast({ title: 'Error', description: 'Failed to fetch sales report', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSales();
    }, []);

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: `Sales_Report_${format(new Date(), 'yyyy-MM-dd')}`,
    });

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleApplyFilters = () => {
        fetchSales();
    };

    // calculate totals
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalTickets = sales.reduce((sum, sale) => sum + sale.seats.length, 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold tracking-tight">Sales Report</h1>
                <Button onClick={handlePrint} className="gap-2">
                    <Printer className="h-4 w-4" />
                    Print Report
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        Filter Sales
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="grid gap-2 flex-1">
                            <label className="text-sm font-medium">Start Date</label>
                            <Input
                                type="date"
                                name="startDate"
                                value={filters.startDate}
                                onChange={handleFilterChange}
                            />
                        </div>
                        <div className="grid gap-2 flex-1">
                            <label className="text-sm font-medium">End Date</label>
                            <Input
                                type="date"
                                name="endDate"
                                value={filters.endDate}
                                onChange={handleFilterChange}
                            />
                        </div>
                        <Button onClick={handleApplyFilters} variant="secondary">
                            Apply Filters
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">৳{totalRevenue.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Tickets Sold</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalTickets}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{sales.length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Sales Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Detailed Sales Log</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Booking ID</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Route / Operator</TableHead>
                                        <TableHead>Seats</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sales.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                                                No sales records found for this period.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        sales.map((sale) => (
                                            <TableRow key={sale._id}>
                                                <TableCell className="font-medium">
                                                    {format(new Date(sale.createdAt), 'MMM dd, HH:mm')}
                                                </TableCell>
                                                <TableCell>{sale.bookingId}</TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{sale.contactInfo?.name}</div>
                                                    <div className="text-xs text-muted-foreground">{sale.contactInfo?.phone}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        {sale.tripSchedule?.route?.origin} → {sale.tripSchedule?.route?.destination}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">{sale.operator?.name}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground">
                                                        {sale.seats.join(', ')}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    ৳{sale.totalAmount}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${sale.status === 'confirmed' || sale.status === 'completed'
                                                            ? 'bg-green-50 text-green-700 ring-green-600/20'
                                                            : sale.status === 'cancelled'
                                                                ? 'bg-red-50 text-red-700 ring-red-600/20'
                                                                : 'bg-yellow-50 text-yellow-800 ring-yellow-600/20'
                                                        }`}>
                                                        {sale.status}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Hidden Printable Component */}
            <div style={{ display: 'none' }}>
                <div ref={componentRef}>
                    <PrintableReport
                        sales={sales}
                        dateRange={{ start: filters.startDate, end: filters.endDate }}
                    />
                </div>
            </div>
        </div>
    );
}
