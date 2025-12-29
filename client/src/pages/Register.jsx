import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Bus, Loader2, UserPlus } from 'lucide-react';

export default function Register() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast({
                title: 'Password Mismatch',
                description: 'Passwords do not match',
                variant: 'destructive'
            });
            return;
        }

        setLoading(true);

        try {
            await register({
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                password: formData.password
            });
            toast({ title: 'Welcome!', description: 'Registration successful' });
            navigate('/');
        } catch (error) {
            toast({
                title: 'Registration Failed',
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            {/* Right Side - Image/Brand (Order changed for Register) */}
            <div className="hidden lg:flex relative bg-slate-900 text-white overflow-hidden order-2 lg:order-1">
                <div className="absolute inset-0 bg-gradient-to-bl from-indigo-600 via-violet-600 to-purple-800 opacity-90" />
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1570125909232-eb2be79a1c74?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay opacity-50" />

                <div className="relative z-10 flex flex-col justify-between p-16 w-full h-full">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                            <Bus className="h-6 w-6" />
                        </div>
                        <span className="text-xl font-bold tracking-wide">BusBD</span>
                    </div>

                    <div className="space-y-6 max-w-lg">
                        <h2 className="text-4xl font-bold leading-tight">
                            Start your journey with us today.
                        </h2>
                        <p className="text-lg font-light leading-relaxed text-white/80">
                            Create an account to unlock exclusive deals, real-time booking management, and a seamless travel experience across Bangladesh.
                        </p>

                        <div className="flex gap-4 p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                            <div className="flex-1">
                                <div className="text-2xl font-bold">100%</div>
                                <div className="text-xs text-white/60 uppercase tracking-wider">Secure</div>
                            </div>
                            <div className="w-px bg-white/20" />
                            <div className="flex-1">
                                <div className="text-2xl font-bold">24/7</div>
                                <div className="text-xs text-white/60 uppercase tracking-wider">Support</div>
                            </div>
                            <div className="w-px bg-white/20" />
                            <div className="flex-1">
                                <div className="text-2xl font-bold">50+</div>
                                <div className="text-xs text-white/60 uppercase tracking-wider">Partners</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center text-sm text-white/50">
                        <div>© 2024 BusBD Inc.</div>
                    </div>
                </div>
            </div>

            {/* Left Side - Form */}
            <div className="flex items-center justify-center p-8 bg-background relative overflow-hidden order-1 lg:order-2">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

                <Card className="w-full max-w-md border-none shadow-none bg-transparent relative z-10">
                    <CardHeader className="text-center space-y-4">
                        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-violet-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20 transform -rotate-3 hover:rotate-0 transition-transform">
                            <UserPlus className="h-8 w-8 text-white" />
                        </div>
                        <CardTitle className="text-3xl font-bold tracking-tight">Create Account</CardTitle>
                        <CardDescription className="text-base text-muted-foreground">
                            Enter your details to register
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 mt-2">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="ml-1">Full Name</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    placeholder="John Doe"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="h-11 bg-muted/30 border-input/50 focus:bg-background transition-all rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="ml-1">Email</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className="h-11 bg-muted/30 border-input/50 focus:bg-background transition-all rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="ml-1">Phone</Label>
                                <Input
                                    id="phone"
                                    name="phone"
                                    placeholder="+880 1XXX-XXXXXX"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    required
                                    className="h-11 bg-muted/30 border-input/50 focus:bg-background transition-all rounded-xl"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="ml-1">Password</Label>
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        placeholder="••••••"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                        minLength={6}
                                        className="h-11 bg-muted/30 border-input/50 focus:bg-background transition-all rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword" className="ml-1">Confirm</Label>
                                    <Input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        placeholder="••••••"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        required
                                        className="h-11 bg-muted/30 border-input/50 focus:bg-background transition-all rounded-xl"
                                    />
                                </div>
                            </div>
                            <Button type="submit" className="w-full h-12 text-base font-semibold rounded-xl gradient-primary shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all hover:-translate-y-0.5 mt-2" disabled={loading}>
                                {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : "Register"}
                            </Button>
                        </form>

                        <div className="text-center text-sm">
                            Already have an account?{' '}
                            <Link to="/login" className="font-semibold text-primary hover:underline underline-offset-4">
                                Sign in
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
