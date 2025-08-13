import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Users,
  Shield,
  Calendar,
  Activity,
  Eye,
  MoreHorizontal
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import type { User } from '@shared/schema';

interface EnhancedUser extends User {
  domain: string;
  imageCount: number;
  videoCount: number;
  projectCount: number;
  isActivated: boolean;
}

interface UsersDataTableProps {
  onUserSelect: (user: EnhancedUser) => void;
  onSelectionChange: (selectedIds: string[]) => void;
  selectedIds: string[];
  globalFilters?: {
    dateFrom?: Date;
    dateTo?: Date;
    roleFilter?: string;
    statusFilter?: string;
    domainFilter?: string;
    activatedFilter?: string;
  };
}

export default function UsersDataTable({ 
  onUserSelect, 
  onSelectionChange, 
  selectedIds,
  globalFilters = {}
}: UsersDataTableProps) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'lastLoginAt' | 'createdAt' | 'email' | 'imageCount' | 'videoCount' | 'projectCount'>('lastLoginAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Local filters (in addition to global ones)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all');
  const [domainFilter, setDomainFilter] = useState('');
  const [activatedFilter, setActivatedFilter] = useState<'all' | 'activated' | 'not_activated'>('all');

  const { data: usersData, isLoading } = useQuery({
    queryKey: [
      '/api/admin/users/paginated', 
      { 
        page, 
        limit, 
        search, 
        statusFilter: globalFilters.statusFilter || statusFilter,
        roleFilter: globalFilters.roleFilter || roleFilter,
        domainFilter: globalFilters.domainFilter || domainFilter,
        activatedFilter: globalFilters.activatedFilter || activatedFilter,
        sortBy, 
        sortOrder,
        dateFrom: globalFilters.dateFrom,
        dateTo: globalFilters.dateTo
      }
    ],
    queryFn: () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
        ...(search && { search }),
        ...(globalFilters.statusFilter && { statusFilter: globalFilters.statusFilter }),
        ...(globalFilters.roleFilter && { roleFilter: globalFilters.roleFilter }),
        ...(globalFilters.domainFilter && { domainFilter: globalFilters.domainFilter }),
        ...(globalFilters.activatedFilter && { activatedFilter: globalFilters.activatedFilter }),
        ...(!globalFilters.statusFilter && statusFilter !== 'all' && { statusFilter }),
        ...(!globalFilters.roleFilter && roleFilter !== 'all' && { roleFilter }),
        ...(!globalFilters.domainFilter && domainFilter && { domainFilter }),
        ...(!globalFilters.activatedFilter && activatedFilter !== 'all' && { activatedFilter }),
        ...(globalFilters.dateFrom && { dateFrom: globalFilters.dateFrom.toISOString() }),
        ...(globalFilters.dateTo && { dateTo: globalFilters.dateTo.toISOString() }),
      });
      
      return apiRequest(`/api/admin/users/paginated?${params}`);
    },
    retry: false,
  });

  const handleSort = useCallback((column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setPage(1); // Reset to first page when sorting
  }, [sortBy, sortOrder]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (!usersData?.users) return;
    
    if (checked) {
      const allIds = usersData.users.map(user => user.id);
      onSelectionChange([...new Set([...selectedIds, ...allIds])]);
    } else {
      const currentPageIds = usersData.users.map(user => user.id);
      onSelectionChange(selectedIds.filter(id => !currentPageIds.includes(id)));
    }
  }, [usersData?.users, selectedIds, onSelectionChange]);

  const handleSelectUser = useCallback((userId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, userId]);
    } else {
      onSelectionChange(selectedIds.filter(id => id !== userId));
    }
  }, [selectedIds, onSelectionChange]);

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'Never';
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return <ArrowUpDown className="w-4 h-4" />;
    return sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  const users = usersData?.users || [];
  const totalCount = usersData?.totalCount || 0;
  const totalPages = usersData?.totalPages || 1;
  const currentPageHasSelection = users.some(user => selectedIds.includes(user.id));
  const isAllCurrentPageSelected = users.length > 0 && users.every(user => selectedIds.includes(user.id));

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Users Management</span>
            <Badge variant="secondary">{totalCount} total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name, email, or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {!globalFilters.statusFilter && (
              <Select value={statusFilter} onValueChange={(value: typeof statusFilter) => setStatusFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            {!globalFilters.roleFilter && (
              <Select value={roleFilter} onValueChange={(value: typeof roleFilter) => setRoleFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            {!globalFilters.activatedFilter && (
              <Select value={activatedFilter} onValueChange={(value: typeof activatedFilter) => setActivatedFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Activated" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="activated">Activated</SelectItem>
                  <SelectItem value="not_activated">Not Activated</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selection Summary */}
      {selectedIds.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedIds.length} user{selectedIds.length > 1 ? 's' : ''} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectionChange([])}
              >
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllCurrentPageSelected}
                    indeterminate={currentPageHasSelection && !isAllCurrentPageSelected}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Email</span>
                    {getSortIcon('email')}
                  </div>
                </TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => handleSort('lastLoginAt')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Last Active</span>
                    {getSortIcon('lastLoginAt')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Joined</span>
                    {getSortIcon('createdAt')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none text-center"
                  onClick={() => handleSort('imageCount')}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Images</span>
                    {getSortIcon('imageCount')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none text-center"
                  onClick={() => handleSort('videoCount')}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Videos</span>
                    {getSortIcon('videoCount')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none text-center"
                  onClick={() => handleSort('projectCount')}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Projects</span>
                    {getSortIcon('projectCount')}
                  </div>
                </TableHead>
                <TableHead className="text-center">Activated</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: limit }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={12}>
                      <div className="flex items-center space-x-4 animate-pulse">
                        <div className="w-4 h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded flex-1"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                    No users found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow 
                    key={user.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={(e) => {
                      if (e.target instanceof HTMLInputElement) return;
                      onUserSelect(user);
                    }}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(user.id)}
                        onCheckedChange={(checked) => handleSelectUser(user.id, !!checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {user.profileImageUrl && (
                          <img 
                            src={user.profileImageUrl} 
                            alt={user.firstName || user.email || 'User'} 
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <div className="font-mono text-sm">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {user.domain || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? 'default' : 'destructive'}>
                        <Activity className="w-3 h-3 mr-1" />
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(user.lastLoginAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(user.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">
                        {user.imageCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">
                        {user.videoCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">
                        {user.projectCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={user.isActivated ? 'default' : 'secondary'}>
                        {user.isActivated ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onUserSelect(user)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalCount)} of {totalCount} users
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  <ChevronsLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <div className="flex items-center space-x-1">
                  <span className="text-sm">Page {page} of {totalPages}</span>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                >
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}