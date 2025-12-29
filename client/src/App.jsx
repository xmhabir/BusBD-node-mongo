import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from './hooks/useAuth';
import { Toaster } from './components/ui/toaster';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import SearchResults from './pages/SearchResults';
import TripDetails from './pages/TripDetails';
import Login from './pages/Login';
import Register from './pages/Register';
import MyBookings from './pages/MyBookings';
import AdminDashboard from './pages/admin/Dashboard';
import Footer from './components/Footer';
import NProgress from 'nprogress';

import { ThemeProvider } from "@/components/theme-provider"

function App() {
    const location = useLocation();

    useEffect(() => {
        NProgress.start();
        const timer = setTimeout(() => NProgress.done(), 500); // Small artificial delay for visibility
        return () => clearTimeout(timer);
    }, [location]);

    return (
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <AuthProvider>
                <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
                    <Navbar />
                    <main>
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/search" element={<SearchResults />} />
                            <Route path="/trip/:id" element={<TripDetails />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/my-bookings" element={<MyBookings />} />
                            <Route path="/admin/*" element={<AdminDashboard />} />
                        </Routes>
                    </main>
                    <Toaster />
                </div >
            </AuthProvider >
        </ThemeProvider>
    );
}

export default App;
