import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, Shield } from "lucide-react";

export default function AdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiRequest(`/api/admin/users/${userId}/role`, "PATCH", { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    },
    onError: (error) => {
      console.error("Error updating role:", error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const handleRoleChange = (userId: string, role: string) => {
    updateRoleMutation.mutate({ userId, role });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
        </div>
        <p className="text-gray-600">
          Assign roles to users for testing the instructor and student interfaces
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Users
          </CardTitle>
          <CardDescription>
            Manage user roles to test different access levels in the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user: any) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">
                      {user.firstName?.charAt(0) || user.email?.charAt(0) || "U"}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">
                        {user.firstName && user.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : user.email || `User ${user.id}`}
                      </p>
                      <Badge 
                        variant={user.role === "instructor" ? "default" : "secondary"}
                        className={user.role === "instructor" ? "bg-blue-100 text-blue-800" : ""}
                      >
                        {user.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <p className="text-xs text-gray-400">ID: {user.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Select
                    value={user.role}
                    onValueChange={(role) => handleRoleChange(user.id, role)}
                    disabled={updateRoleMutation.isPending}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="instructor">Instructor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
            
            {users.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No users found. Users will appear here after they log in.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">How to Test Different Roles:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
              <li>Log in with your Replit account (you'll appear in the user list above)</li>
              <li>Use this page to change your role to "instructor" or "student"</li>
              <li>Navigate back to the home page to see the role-specific interface</li>
              <li>Test instructor features: create questions, exams, and view analytics</li>
              <li>Test student features: take exams and view grades</li>
            </ol>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-medium text-green-900 mb-2">Role Differences:</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-green-800 mb-1">Instructor Role:</h4>
                <ul className="list-disc list-inside text-green-700 space-y-1">
                  <li>Question bank management</li>
                  <li>Exam creation and settings</li>
                  <li>Grading interface</li>
                  <li>Analytics and reports</li>
                  <li>Student management</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-green-800 mb-1">Student Role:</h4>
                <ul className="list-disc list-inside text-green-700 space-y-1">
                  <li>View available exams</li>
                  <li>Take exams with timer</li>
                  <li>View grades and feedback</li>
                  <li>Assignment tracking</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}