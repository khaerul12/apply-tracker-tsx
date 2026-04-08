import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, getDocs, where, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { UserProfile, JobApplication } from '@/types';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import { 
  Popover, PopoverContent, PopoverTrigger 
} from '@/components/ui/popover';
import { Search, Eye, Shield, User as UserIcon, History } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function Admin() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userApps, setUserApps] = useState<JobApplication[]>([]);
  const [isAppsDialogOpen, setIsAppsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role !== 'admin') return;

    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => doc.data() as UserProfile);
      setUsers(usersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const viewUserApps = async (user: UserProfile) => {
    setSelectedUser(user);
    const q = query(
      collection(db, 'applications'), 
      where('userId', '==', user.uid),
      orderBy('applyDate', 'desc')
    );
    const snapshot = await getDocs(q);
    const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobApplication));
    setUserApps(apps);
    setIsAppsDialogOpen(true);
  };

  const toggleSubscription = async (user: UserProfile) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isSubscribed: !user.isSubscribed
      });
      toast.success('Subscription status updated');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update subscription');
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (profile?.uid === user.uid) {
      toast.error('You cannot delete your own admin account from this panel.');
      return;
    }

    const confirmed = window.confirm(`Delete ${user.email} and all associated application data? This cannot be undone.`);
    if (!confirmed) return;

    try {
      const appsQuery = query(collection(db, 'applications'), where('userId', '==', user.uid));
      const appsSnapshot = await getDocs(appsQuery);
      const batch = writeBatch(db);

      appsSnapshot.docs.forEach((appDoc) => batch.delete(appDoc.ref));
      batch.delete(doc(db, 'users', user.uid));

      await batch.commit();
      toast.success('User account and related applications deleted');
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete user account');
    }
  };

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (profile?.role !== 'admin') {
    return <div className="p-8 text-center">Access Denied. Admins only.</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Admin Panel</h2>
        <p className="text-muted-foreground">Manage users and monitor application data.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>User Management</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search users..." 
                className="pl-8" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Trial Ends</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u) => (
                <TableRow key={u.uid}>
                  <TableCell>
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                        <UserIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{u.displayName || 'Anonymous'}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(u.trialEndsAt.toDate(), 'PP')}</TableCell>
                  <TableCell>
                    {u.isSubscribed ? (
                      <Badge className="bg-green-500">Subscribed</Badge>
                    ) : (
                      <Badge variant="outline">Trial</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => viewUserApps(u)}>
                      <Eye className="mr-2 h-4 w-4" /> View Data
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleSubscription(u)}
                    >
                      <Shield className="mr-2 h-4 w-4" /> 
                      {u.isSubscribed ? 'Unsubscribe' : 'Subscribe'}
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleDeleteUser(u)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isAppsDialogOpen} onOpenChange={setIsAppsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Applications for {selectedUser?.displayName}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userApps.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.companyName}</TableCell>
                    <TableCell>{app.position}</TableCell>
                    <TableCell>{format(app.applyDate.toDate(), 'PP')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{app.result}</Badge>
                        {app.logs && app.logs.length > 0 && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full">
                                <History className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-3">
                              <div className="space-y-3">
                                <h4 className="font-medium text-sm border-b pb-1">Status History</h4>
                                <div className="space-y-2">
                                  {app.logs.slice().reverse().map((log, i) => (
                                    <div key={i} className="flex justify-between items-start text-xs">
                                      <div className="flex flex-col">
                                        <span className="font-medium">{log.status}</span>
                                        <span className="text-[10px] text-muted-foreground">
                                          {format(log.timestamp.toDate(), 'dd MMM yyyy, HH:mm')}
                                        </span>
                                      </div>
                                      {i === 0 && <Badge variant="outline" className="text-[9px] h-4 px-1">Current</Badge>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {userApps.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                      No applications found for this user.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
