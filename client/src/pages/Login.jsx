import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Bus, Loader2, ArrowRight } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await login(email, password);
            toast({ title: 'Welcome back!', description: 'Login successful' });
            navigate('/');
        } catch (error) {
            toast({
                title: 'Login Failed',
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            {/* Left Side - Form */}
            <div className="flex items-center justify-center p-8 bg-background relative overflow-hidden">
                {/* Background Blobs */}
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

                <Card className="w-full max-w-md border-none shadow-none bg-transparent relative z-10">
                    <CardHeader className="text-center space-y-4">
                        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-violet-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20 transform rotate-3 hover:rotate-6 transition-transform">
                            <Bus className="h-8 w-8 text-white" />
                        </div>
                        <CardTitle className="text-3xl font-bold tracking-tight">Welcome back</CardTitle>
                        <CardDescription className="text-base text-muted-foreground">
                            Enter your credentials to access your account
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8 mt-4">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium ml-1">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="h-12 bg-muted/30 border-input/50 focus:bg-background transition-all rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between ml-1">
                                    <Label htmlFor="password">Password</Label>
                                    <Link to="#" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                                        Forgot password?
                                    </Link>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="h-12 bg-muted/30 border-input/50 focus:bg-background transition-all rounded-xl"
                                />
                            </div>
                            <Button type="submit" className="w-full h-12 text-base font-semibold rounded-xl gradient-primary shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all hover:-translate-y-0.5" disabled={loading}>
                                {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : "Sign in"}
                                {!loading && <ArrowRight className="ml-2 h-5 w-5 opacity-50" />}
                            </Button>
                        </form>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-dashed" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-4 text-muted-foreground font-medium">Or continue with</span>
                            </div>
                        </div>

                        <div className="text-center text-sm">
                            Don't have an account?{' '}
                            <Link to="/register" className="font-semibold text-primary hover:underline underline-offset-4">
                                Create an account
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Right Side - Image/Brand */}
            <div className="hidden lg:flex relative bg-slate-900 text-white overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-800 opacity-90" />
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=2069&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay opacity-50" />

                {/* Decorative circles */}
                <div className="absolute top-[20%] right-[10%] w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-[20%] left-[10%] w-48 h-48 bg-purple-500/30 rounded-full blur-3xl animate-pulse delay-1000" />

                <div className="relative z-10 flex flex-col justify-between p-16 w-full h-full">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                            <Bus className="h-6 w-6" />
                        </div>
                        <span className="text-xl font-bold tracking-wide">BusBD</span>
                    </div>

                    <div className="space-y-6 max-w-lg">
                        <h2 className="text-4xl font-bold leading-tight">
                            The smartest way to book your next journey.
                        </h2>
                        <blockquote className="text-lg font-light leading-relaxed text-white/80 border-l-2 border-white/30 pl-6">
                            "Travel represents a conscious state of mind. We help you find your destination with comfort and ease unlike ever before."
                        </blockquote>

                        <div className="flex items-center gap-4 pt-4">
                            <div className="flex -space-x-3">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className={`w-10 h-10 rounded-full border-2 border-indigo-500 bg-indigo-${300 + i * 100} flex items-center justify-center text-xs font-bold text-indigo-900`}>
                                        U{i}
                                    </div>
                                ))}
                            </div>
                            <div className="text-sm font-medium">Join 50k+ travelers</div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center text-sm text-white/50">
                        <div>© 2024 BusBD Inc.</div>
                        <div className="flex gap-6">
                            <a href="#" className="hover:text-white transition-colors">Privacy</a>
                            <a href="#" className="hover:text-white transition-colors">Terms</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
