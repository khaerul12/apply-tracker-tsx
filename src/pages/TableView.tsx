import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { JobApplication, ApplicationResult, EducationLevel } from '@/types';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Popover, PopoverContent, PopoverTrigger 
} from '@/components/ui/popover';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MoreHorizontal, ExternalLink, Edit2, Trash2, AlertCircle, History, FileDown } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

const RESULTS: ApplicationResult[] = ['Applied', 'No Response', 'Interviewing', 'Approve', 'Decline', 'Processed', 'View'];
const EDUCATION_LEVELS: EducationLevel[] = ['SMA/SMK', 'D3', 'S1/D4', 'S2', 'No Minimum Education'];

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
const FILTER_OPTIONS = [
  { value: 'date', label: 'Date' },
  { value: 'location', label: 'Location' },
  { value: 'platform', label: 'Platform' },
  { value: 'result', label: 'Hasil' },
  { value: 'education', label: 'Education' },
] as const;

export default function TableView() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingApp, setEditingApp] = useState<JobApplication | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<'date' | 'location' | 'platform' | 'result' | 'education'>('location');
  const [filterQuery, setFilterQuery] = useState('');
  const [pageSize, setPageSize] = useState<number>(10);
  const [pageIndex, setPageIndex] = useState<number>(0);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'applications'),
      where('userId', '==', user.uid),
      orderBy('applyDate', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as JobApplication[];
      setApplications(apps);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApp || !editingApp.id) return;

    try {
      const appRef = doc(db, 'applications', editingApp.id);
      const now = Timestamp.now();
      const oldApp = applications.find((a) => a.id === editingApp.id);
      let newLogs = editingApp.logs || [];

      if (oldApp && oldApp.result !== editingApp.result) {
        newLogs = [...newLogs, { status: editingApp.result, timestamp: now }];
      }

      await updateDoc(appRef, {
        companyName: editingApp.companyName,
        position: editingApp.position,
        location: editingApp.location,
        platform: editingApp.platform,
        result: editingApp.result,
        minEducation: editingApp.minEducation,
        jobLink: editingApp.jobLink,
        logs: newLogs,
        updatedAt: now,
      });

      toast.success('Application updated');
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this application?')) return;

    try {
      await deleteDoc(doc(db, 'applications', id));
      toast.success('Application deleted');
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete');
    }
  };

  const filteredApplications = applications.filter((app) => {
    const query = filterQuery.trim().toLowerCase();
    if (!query) return true;

    switch (filterType) {
      case 'date':
        return format(app.applyDate.toDate(), 'yyyy-MM-dd').includes(query);
      case 'location':
        return (app.location || '').toLowerCase().includes(query);
      case 'platform':
        return (app.platform || '').toLowerCase().includes(query);
      case 'result':
        return app.result.toLowerCase().includes(query);
      case 'education':
        return (app.minEducation || '').toLowerCase().includes(query);
      default:
        return true;
    }
  });

  const totalPages = Math.max(1, Math.ceil(filteredApplications.length / pageSize));
  const currentPage = Math.min(pageIndex, totalPages - 1);
  const pageStart = filteredApplications.length === 0 ? 0 : currentPage * pageSize + 1;
  const pageEnd = Math.min((currentPage + 1) * pageSize, filteredApplications.length);
  const paginatedApplications = filteredApplications.slice(pageStart - 1, pageEnd);

  useEffect(() => {
    if (pageIndex >= totalPages) {
      setPageIndex(totalPages - 1);
    }
  }, [pageIndex, totalPages]);

  const getFilterPlaceholder = () => {
    switch (filterType) {
      case 'date':
        return 'yyyy-mm-dd';
      case 'location':
        return 'Search location';
      case 'platform':
        return 'Search platform';
      case 'result':
        return 'Search hasil/status';
      case 'education':
        return 'Search education';
      default:
        return 'Search';
    }
  };

  const handleFilterTypeChange = (value: string) => {
    setFilterType(value as 'date' | 'location' | 'platform' | 'result' | 'education');
    setFilterQuery('');
    setPageIndex(0);
  };

  const handleFilterChange = (value: string) => {
    setFilterQuery(value);
    setPageIndex(0);
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setPageIndex(0);
  };

  const handlePrevPage = () => setPageIndex((value) => Math.max(value - 1, 0));
  const handleNextPage = () => setPageIndex((value) => Math.min(value + 1, totalPages - 1));

  const getStatusBadge = (app: JobApplication) => {
    const result = app.result;
    let badge;

    switch (result) {
      case 'Approve': badge = <Badge className="bg-green-500">Approve</Badge>; break;
      case 'Decline': badge = <Badge variant="destructive">Decline</Badge>; break;
      case 'Interviewing': badge = <Badge className="bg-blue-500">Interviewing</Badge>; break;
      case 'Applied': badge = <Badge variant="secondary">Applied</Badge>; break;
      default: badge = <Badge variant="outline">{result}</Badge>; break;
    }

    return (
      <div className="flex items-center gap-2">
        {badge}
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
    );
  };

  const exportToExcel = () => {
    if (applications.length === 0) {
      toast.error('No data to export');
      return;
    }

    const dataToExport = applications.map((app, index) => ({
      'No': index + 1,
      'Company Name': app.companyName,
      'Position': app.position,
      'Location': app.location || '-',
      'Apply Date': format(app.applyDate.toDate(), 'dd/MM/yyyy'),
      'Platform': app.platform || '-',
      'Result': app.result,
      'Min Education': app.minEducation || '-',
      'Job Link': app.jobLink || '-',
      'Created At': format(app.createdAt.toDate(), 'dd/MM/yyyy HH:mm'),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Applications');
    const fileName = `Job_Applications_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success('Exported to Excel successfully');
  };

  if (loading) return <div>Loading applications...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Table View</h2>
          <p className="text-muted-foreground">Manage and track all your job applications.</p>
        </div>
        <Button variant="outline" onClick={exportToExcel}>
          <FileDown className="mr-2 h-4 w-4" /> Export Excel
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_auto] items-end">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Filter by</label>
            <Select value={filterType} onValueChange={handleFilterTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-medium">Search</label>
            <Input
              type={filterType === 'date' ? 'date' : 'text'}
              value={filterQuery}
              onChange={(e) => handleFilterChange(e.target.value)}
              placeholder={getFilterPlaceholder()}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Rows per page</label>
            <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>{size} view</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={currentPage === 0} onClick={handlePrevPage}>Previous</Button>
            <Button variant="outline" disabled={currentPage >= totalPages - 1} onClick={handleNextPage}>Next</Button>
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">No.</TableHead>
              <TableHead>Perusahaan</TableHead>
              <TableHead>Posisi</TableHead>
              <TableHead>Lokasi</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Hasil</TableHead>
              <TableHead>Pendidikan</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedApplications.length > 0 ? (
              paginatedApplications.map((app, index) => {
                const daysSinceApply = differenceInDays(new Date(), app.applyDate.toDate());
                const isOld = daysSinceApply > 30 && app.result === 'Applied';

                return (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{pageStart + index}</TableCell>
                    <TableCell>
                      <div className="font-medium">{app.companyName}</div>
                      {app.jobLink && (
                        <a
                          href={app.jobLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-blue-500 hover:underline flex items-center"
                        >
                          View Link <ExternalLink className="ml-1 h-2 w-2" />
                        </a>
                      )}
                    </TableCell>
                    <TableCell>{app.position}</TableCell>
                    <TableCell>{app.location || '-'}</TableCell>
                    <TableCell>{format(app.applyDate.toDate(), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{app.platform || '-'}</TableCell>
                    <TableCell>
                      {isOld ? (
                        <div className="flex items-center text-orange-500 text-xs font-medium">
                          <AlertCircle className="h-3 w-3 mr-1" /> &gt; 30 Days
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Recent</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(app)}</TableCell>
                    <TableCell className="text-xs">{app.minEducation || '-'}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className={cn(
                            buttonVariants({ variant: 'ghost', size: 'icon' }),
                            'h-8 w-8 p-0'
                          )}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setEditingApp(app);
                            setIsEditDialogOpen(true);
                          }}>
                            <Edit2 className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => app.id && handleDelete(app.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                  {filterQuery.trim()
                    ? `No applications match the selected ${filterType} filter.`
                    : 'No applications found. Start by adding one!'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredApplications.length === 0
            ? 'No results'
            : `Showing ${pageStart}-${pageEnd} of ${filteredApplications.length}`}
        </p>
        <p className="text-sm text-muted-foreground">Page {currentPage + 1} of {totalPages}</p>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Application</DialogTitle>
          </DialogHeader>
          {editingApp && (
            <form onSubmit={handleUpdate} className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Perusahaan</label>
                <Input
                  value={editingApp.companyName}
                  onChange={(e) => setEditingApp({ ...editingApp, companyName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Posisi</label>
                <Input
                  value={editingApp.position}
                  onChange={(e) => setEditingApp({ ...editingApp, position: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Hasil</label>
                  <Select
                    value={editingApp.result}
                    onValueChange={(v) => setEditingApp({ ...editingApp, result: v as ApplicationResult })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESULTS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pendidikan</label>
                  <Select
                    value={editingApp.minEducation}
                    onValueChange={(v) => setEditingApp({ ...editingApp, minEducation: v as EducationLevel })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EDUCATION_LEVELS.map((e) => (
                        <SelectItem key={e} value={e}>{e}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
