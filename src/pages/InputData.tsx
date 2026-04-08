import React, { useState } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import * as XLSX from 'xlsx';
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
const COMMON_PLATFORMS = [
  "LinkedIn",
  "Indeed",
  "Glints",
  "JobStreet",
  "Kalibrr",
  "Glassdoor",
  "Company Website",
  "Referral",
  "Other"
];
const TEMPLATE_HEADERS = [
  'companyName',
  'position',
  'location',
  'applyDate',
  'platform',
  'result',
  'minEducation',
  'jobLink',
] as const;

const parseApplyDate = (value: unknown) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    const result = XLSX.SSF.parse_date_code(value);
    if (result && typeof result.y === 'number') {
      return new Date(result.y, (result.m ?? 1) - 1, result.d ?? 1, result.H ?? 0, result.M ?? 0, result.S ?? 0);
    }
  }
  const date = new Date(String(value));
  return isNaN(date.getTime()) ? null : date;
};

const normalizeRow = (row: Record<string, any>) => {
  const get = (key: string) => {
    if (row[key] !== undefined) return row[key];
    const lowerKey = key.toLowerCase();
    if (row[lowerKey] !== undefined) return row[lowerKey];
    // Convert camelCase to space separated
    const spacedKey = key.replace(/([A-Z])/g, ' $1').toLowerCase();
    return row[spacedKey] || '';
  };

  return {
    companyName: String(get('companyName') || get('Company Name') || get('Nama Perusahaan') || '').trim(),
    position: String(get('position') || get('Position') || get('Posisi') || '').trim(),
    location: String(get('location') || get('Location') || get('Lokasi') || '').trim(),
    applyDate: get('applyDate') || get('Apply Date') || get('Tanggal Lamar') || '',
    platform: String(get('platform') || get('Platform') || get('Melamar Lewat') || '').trim(),
    result: String(get('result') || get('Result') || 'Applied').trim(),
    minEducation: String(get('minEducation') || get('Min Education') || get('Min. Pendidikan') || 'No Minimum Education').trim(),
    jobLink: String(get('jobLink') || get('Job Link') || '').trim(),
  };
};

export default function InputData() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
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
  const [customPlatform, setCustomPlatform] = useState('');

  // Load custom platforms from localStorage
  const customPlatforms = JSON.parse(localStorage.getItem('customPlatforms') || '[]');
  const allPlatforms = [...COMMON_PLATFORMS.filter(p => p !== 'Other'), ...customPlatforms, 'Other'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.companyName || !formData.position) {
      toast.error('Company Name and Position are required');
      return;
    }

    const platformValue = formData.platform === 'Other' ? customPlatform.trim() : formData.platform;

    if (!platformValue) {
      toast.error('Platform is required');
      return;
    }

    // Store new platforms in localStorage for future suggestions
    if (formData.platform === 'Other' && customPlatform.trim()) {
      const storedPlatforms = JSON.parse(localStorage.getItem('customPlatforms') || '[]');
      if (!storedPlatforms.includes(customPlatform.trim())) {
        storedPlatforms.push(customPlatform.trim());
        localStorage.setItem('customPlatforms', JSON.stringify(storedPlatforms));
      }
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
        platform: platformValue,
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
      setCustomPlatform('');
      setDate(new Date());
    } catch (error) {
      console.error(error);
      toast.error('Failed to save application');
    } finally {
      setLoading(false);
    }
  };

  const downloadImportTemplate = () => {
    const templateData = [
      {
        companyName: 'Google',
        position: 'Frontend Developer',
        location: 'Jakarta',
        applyDate: format(new Date(), 'yyyy-MM-dd'),
        platform: 'LinkedIn',
        result: 'Applied',
        minEducation: 'S1/D4',
        jobLink: 'https://example.com/job',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData, { header: Array.from(TEMPLATE_HEADERS) });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ImportTemplate');
    XLSX.writeFile(workbook, 'apply-work-tracker-import-template.xlsx');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        toast.error('Unable to read the first worksheet');
        return;
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
      const documents = [] as Array<Record<string, any>>;
      const now = Timestamp.now();

      for (const row of rows) {
        const normalized = normalizeRow(row);
        if (!normalized.companyName || !normalized.position) {
          continue;
        }

        const parsedDate = parseApplyDate(normalized.applyDate);
        const applyDate = parsedDate ? Timestamp.fromDate(parsedDate) : now;
        const resultValue = RESULTS.includes(normalized.result as ApplicationResult)
          ? (normalized.result as ApplicationResult)
          : 'Applied';
        const minEducationValue = EDUCATION_LEVELS.includes(normalized.minEducation as EducationLevel)
          ? (normalized.minEducation as EducationLevel)
          : 'No Minimum Education';

        documents.push({
          userId: user.uid,
          companyName: normalized.companyName,
          position: normalized.position,
          location: normalized.location,
          applyDate,
          platform: normalized.platform,
          result: resultValue,
          minEducation: minEducationValue,
          jobLink: normalized.jobLink,
          logs: [{ status: resultValue, timestamp: now }],
          createdAt: now,
          updatedAt: now,
        });
      }

      if (documents.length === 0) {
        toast.error('No valid rows found in the import file. Make sure companyName and position are provided.');
        return;
      }

      await Promise.all(documents.map((doc) => addDoc(collection(db, 'applications'), doc)));
      toast.success(`Imported ${documents.length} application(s) successfully!`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to import data from the file');
    } finally {
      setImportLoading(false);
      if (e.target) e.target.value = '';
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
          <CardTitle>Import from Excel / CSV</CardTitle>
          <CardDescription>Upload a file to import multiple applications at once.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Import File</label>
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImport}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="outline" onClick={downloadImportTemplate}>
              Download Import Template
            </Button>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Required: <code>companyName</code>, <code>position</code>. Optional: <code>location</code>, <code>applyDate</code>, <code>platform</code>, <code>result</code>, <code>minEducation</code>, <code>jobLink</code>. Use <code>yyyy-mm-dd</code> for dates.
            </p>
          </div>

          {importLoading && (
            <p className="text-sm text-muted-foreground">Importing file, please wait…</p>
          )}
        </CardContent>
      </Card>

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
                <label className="text-sm font-medium">Melamar Lewat *</label>
                <Select 
                  value={formData.platform} 
                  onValueChange={(v) => setFormData({...formData, platform: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {allPlatforms.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.platform === 'Other' && (
                  <Input 
                    placeholder="Enter custom platform" 
                    value={customPlatform}
                    onChange={(e) => setCustomPlatform(e.target.value)}
                    className="mt-2"
                  />
                )}
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
