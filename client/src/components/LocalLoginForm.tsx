
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

export function LocalLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      if (!res.ok) {
        throw new Error("Login failed");
      }
      return res.json();
    },
    onSuccess: async (data) => {
      // Invalidate auth queries to refresh user data
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Get user data to determine role-based redirect
      try {
        const userResponse = await fetch("/api/auth/user");
        if (userResponse.ok) {
          const userData = await userResponse.json();
          
          // Redirect based on user role
          if (userData.role === 'admin' || userData.role === 'instructor') {
            window.location.href = "/";  // Instructor dashboard
          } else if (userData.role === 'student') {
            window.location.href = "/";  // Student dashboard  
          } else {
            window.location.href = "/";  // Default fallback
          }
        } else {
          // Fallback to page reload if we can't get user data
          window.location.reload();
        }
      } catch (error) {
        console.error("Error getting user data for redirect:", error);
        // Fallback to page reload
        window.location.reload();
      }
    },
    onError: (error) => {
      setError("Invalid email or password");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Login to Exam System</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Logging in..." : "Login"}
            </Button>
          </form>
          
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Demo Accounts:</h3>
            <div className="text-sm space-y-1 text-blue-800 dark:text-blue-200">
              <div><strong>Admin:</strong> admin@example.com / password123</div>
              <div><strong>Instructor:</strong> instructor@example.com / password123</div>
              <div><strong>Student:</strong> student@example.com / password123</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
