import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  Search, 
  UserPlus, 
  Trash2, 
  Crown, 
  Loader2,
  Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  profileImageUrl?: string;
  displayName?: string;
  role?: 'owner' | 'member';
  addedAt?: Date;
}

interface ProjectMembersResponse {
  success: boolean;
  owner?: User;
  members?: User[];
}

interface UserSearchResponse {
  success: boolean;
  users: User[];
}

interface ProjectMemberManagerProps {
  projectId: string;
  trigger?: React.ReactNode;
}

export default function ProjectMemberManager({ projectId, trigger }: ProjectMemberManagerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const { toast } = useToast();

  // Fetch project members
  const { data: membersData, isLoading: membersLoading } = useQuery<ProjectMembersResponse>({
    queryKey: ['/api/projects', projectId, 'members'],
    enabled: open
  });

  // Search users
  const { data: searchResults, isLoading: searchLoading } = useQuery<UserSearchResponse>({
    queryKey: ['/api/users/search', searchQuery],
    queryFn: () => apiRequest(`/api/users/search?q=${encodeURIComponent(searchQuery)}`),
    enabled: searchQuery.length >= 2
  });

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: (userId: string) => 
      apiRequest(`/api/projects/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
        headers: {
          'Content-Type': 'application/json'
        }
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setSearchQuery('');
      setShowUserSearch(false);
      toast({
        title: "Success",
        description: data.message || "Member added successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add member",
        variant: "destructive"
      });
    }
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => 
      apiRequest(`/api/projects/${projectId}/members/${userId}`, {
        method: 'DELETE'
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "Success",
        description: data.message || "Member removed successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove member",
        variant: "destructive"
      });
    }
  });

  const handleAddMember = (user: User) => {
    addMemberMutation.mutate(user.id);
  };

  const handleRemoveMember = (userId: string) => {
    removeMemberMutation.mutate(userId);
  };

  const getUserInitials = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.firstName) {
      return user.firstName[0].toUpperCase();
    }
    return user.email[0].toUpperCase();
  };

  const getUserDisplayName = (user: User) => {
    return user.displayName || user.firstName || user.email;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Users className="h-4 w-4 mr-2" />
            Members
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Project Members
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Add Member Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Add Members</h4>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowUserSearch(!showUserSearch)}
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            
            {showUserSearch && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {searchQuery.length >= 2 && (
                  <div className="border rounded-md max-h-48 overflow-y-auto">
                    {searchLoading ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : searchResults?.users && searchResults.users.length > 0 ? (
                      <div className="p-1">
                        {searchResults.users.map((user: User) => (
                          <div
                            key={user.id}
                            className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                            onClick={() => handleAddMember(user)}
                          >
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.profileImageUrl} />
                                <AvatarFallback className="text-xs">
                                  {getUserInitials(user)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {getUserDisplayName(user)}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                            {addMemberMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserPlus className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center p-4 text-sm text-gray-500">
                        No users found
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Current Members Section */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Current Members</h4>
            
            {membersLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (membersData?.owner || (membersData?.members && membersData.members.length > 0)) ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {/* Project Owner */}
                {membersData?.owner && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-md">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={membersData.owner?.profileImageUrl} />
                        <AvatarFallback className="text-xs">
                          {getUserInitials(membersData.owner)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {getUserDisplayName(membersData.owner)}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {membersData.owner?.email}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Crown className="h-3 w-3" />
                      Owner
                    </Badge>
                  </div>
                )}
                
                {/* Project Members */}
                {membersData?.members?.map((member: User) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.profileImageUrl} />
                        <AvatarFallback className="text-xs">
                          {getUserInitials(member)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {getUserDisplayName(member)}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {member.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Member</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={removeMemberMutation.isPending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {removeMemberMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-4 text-sm text-gray-500">
                No members yet. Add team members to collaborate!
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}