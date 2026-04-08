import React, { useState } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ApplicationResult, EducationLevel } from '@/types';

const RESULTS: ApplicationResult[] = ["Applied", "No Response", "Interviewing", "Approve", "Decline", "Processed", "View"];
const EDUCATION_LEVELS: EducationLevel[] = ["SMA/SMK", "D3", "S1/D4", "S2", "No Minimum Education"];

export default function InputData() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  
  const [formData, setFormData] = useState({
    companyName: '',
    position: '',
    location: '',
    platform: '',
    result: 'Applied' as ApplicationResult,
    minEducation: 'No Minimum Education' as EducationLevel,
    jobLink: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.companyName || !formData.position) {
      toast.error('Company Name and Position are required');
      return;
    }

    setLoading(true);
    try {
      const now = Timestamp.now();
      await addDoc(collection(db, 'applications'), {
        userId: user.uid,
        companyName: formData.companyName,
        position: formData.position,
        location: formData.location,
        applyDate: Timestamp.fromDate(date),
        platform: formData.platform,
        result: formData.result,
        minEducation: formData.minEducation,
        jobLink: formData.jobLink,
        logs: [{ status: formData.result, timestamp: now }],
        createdAt: now,
        updatedAt: now,
      });

      toast.success('Application tracked successfully!');
      setFormData({
        companyName: '',
        position: '',
        location: '',
        platform: '',
        result: 'Applied',
        minEducation: 'No Minimum Education',
        jobLink: '',
      });
      setDate(new Date());
    } catch (error) {
      console.error(error);
      toast.error('Failed to save application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Input Data</h2>
        <p className="text-muted-foreground">Add a new job application to your tracker.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application Details</CardTitle>
          <CardDescription>Fill in the information about the job you applied for.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Perusahaan *</label>
                <Input 
                  placeholder="e.g. Google" 
                  value={formData.companyName}
                  onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Posisi *</label>
                <Input 
                  placeholder="e.g. Frontend Developer" 
                  value={formData.position}
                  onChange={(e) => setFormData({...formData, position: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Lokasi</label>
                <Input 
                  placeholder="e.g. Jakarta, Indonesia" 
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                />
              </div>
              <div className="space-y-2 flex flex-col">
                <label className="text-sm font-medium mb-2">Tanggal Lamar *</label>
                <Popover>
                  <PopoverTrigger
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => d && setDate(d)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Melamar Lewat</label>
                <Input 
                  placeholder="e.g. LinkedIn, Glints, Indeed" 
                  value={formData.platform}
                  onChange={(e) => setFormData({...formData, platform: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Hasil *</label>
                <Select 
                  value={formData.result} 
                  onValueChange={(v) => setFormData({...formData, result: v as ApplicationResult})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {RESULTS.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Min. Pendidikan</label>
                <Select 
                  value={formData.minEducation} 
                  onValueChange={(v) => setFormData({...formData, minEducation: v as EducationLevel})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select education" />
                  </SelectTrigger>
                  <SelectContent>
                    {EDUCATION_LEVELS.map(e => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Link Lowongan Kerja</label>
                <Input 
                  type="url"
                  placeholder="https://..." 
                  value={formData.jobLink}
                  onChange={(e) => setFormData({...formData, jobLink: e.target.value})}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Application'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
