"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { COMPANY } from "@/lib/constants";
import Image from "next/image";
import { Loader2, Mail, Lock, User, AlertCircle, ArrowLeft } from "lucide-react";

export function LoginScreen() {
  const { login, register, resetPassword } = useAuth();
  const [tab, setTab] = useState<"login" | "register" | "forgot">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Auto-initialize the database with seed data on first visit
  useEffect(() => {
    fetch("/api/init").catch(() => {});
  }, []);

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");

  // Register form
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  // Reset form
  const [resetEmail, setResetEmail] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await login(loginEmail, loginPass);
    setLoading(false);
    if (!result.ok) setError(result.error || "Login failed");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (regPass !== regConfirm) {
      setError("Passwords do not match");
      return;
    }
    if (regPass.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    const result = await register({ name: regName, email: regEmail, password: regPass });
    setLoading(false);
    if (!result.ok) setError(result.error || "Registration failed");
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await resetPassword(resetEmail);
    setLoading(false);
    if (!result.ok) setError(result.error || "Reset failed");
    else setSuccess("Password reset instructions have been sent to your email.");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8">
      {/* Branding */}
      <div className="flex flex-col items-center mb-8">
        <Image
          src="/Techadox_Logo.png"
          alt="Techadox Logo"
          width={200}
          height={80}
          className="h-20 w-auto object-contain"
          priority
        />
      </div>

      {/* Login Card */}
      <Card className="w-full max-w-md shadow-lg border-border">
        <Tabs value={tab} onValueChange={(v) => { setTab(v as typeof tab); setError(""); setSuccess(""); }}>
          {tab === "forgot" ? (
            <>
              <CardHeader className="text-center">
                <div className="flex items-center gap-2 mb-2">
                  <Button variant="ghost" size="sm" className="p-0 h-auto" onClick={() => setTab("login")}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <CardTitle className="text-lg">Reset Password</CardTitle>
                </div>
                <CardDescription>
                  Enter your company email address to receive a password reset.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {success && <Alert className="mb-4"><AlertDescription>{success}</AlertDescription></Alert>}
                <form onSubmit={handleReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Company Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="you@techadox.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="pl-9"
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Only @techadox.com and @techadox.net email addresses are allowed.
                    </p>
                  </div>
                  {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Reset Instructions
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg">TDX Dispatch Portal</CardTitle>
                <CardDescription>Sign in with your Techadox company account</CardDescription>
              </CardHeader>
              <div className="px-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login" className="py-2">Sign In</TabsTrigger>
                  <TabsTrigger value="register" className="py-2">Register</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="login" className="mt-0">
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4 mt-2">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Company Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="you@techadox.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-pass">Password</Label>
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline"
                          onClick={() => { setTab("forgot"); setError(""); setSuccess(""); }}
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-pass"
                          type="password"
                          placeholder="Enter your password"
                          value={loginPass}
                          onChange={(e) => setLoginPass(e.target.value)}
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>
                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign In
                    </Button>
                  </form>
                </CardContent>
                <CardFooter className="flex justify-center border-t pt-4">
                  <p className="text-xs text-muted-foreground text-center">
                    Allowed domains: @techadox.com, @techadox.net
                  </p>
                </CardFooter>
              </TabsContent>
              <TabsContent value="register" className="mt-0">
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4 mt-2">
                    <div className="space-y-2">
                      <Label htmlFor="reg-name">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reg-name"
                          placeholder="John Doe"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-email">Company Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reg-email"
                          type="email"
                          placeholder="you@techadox.com"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className="pl-9"
                          required
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Only @techadox.com and @techadox.net email addresses are allowed.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-pass">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reg-pass"
                          type="password"
                          placeholder="Minimum 8 characters"
                          value={regPass}
                          onChange={(e) => setRegPass(e.target.value)}
                          className="pl-9"
                          required
                          minLength={8}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-confirm">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reg-confirm"
                          type="password"
                          placeholder="Confirm your password"
                          value={regConfirm}
                          onChange={(e) => setRegConfirm(e.target.value)}
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>
                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Account
                    </Button>
                  </form>
                </CardContent>
                <CardFooter className="flex justify-center border-t pt-4">
                  <p className="text-xs text-muted-foreground text-center">
                    A welcome email will be sent upon successful registration.
                  </p>
                </CardFooter>
              </TabsContent>
            </>
          )}
        </Tabs>
      </Card>

      {/* Company info footer */}
      <footer className="mt-8 text-center space-y-1">
        <p className="text-xs text-muted-foreground">
          {COMPANY.address} &middot; {COMPANY.phone}
        </p>
        <p className="text-xs text-muted-foreground">
          {COMPANY.developer}
        </p>
      </footer>
    </div>
  );
}
