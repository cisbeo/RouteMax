# Forms

## Form Stack

- Zod 4.2 for validation
- Native React hooks (`useState`, `useEffect`)
- Server Actions for submissions
- Sonner for error/success toasts

## Validation Patterns

### Schema Definition

Define Zod schemas co-located with components or in dedicated schema files.

```typescript
// lib/schemas/client.ts
import { z } from 'zod';

export const clientSchema = z.object({
  name: z.string().min(1, 'Name required').max(100),
  address: z.string().min(5, 'Address must be detailed'),
});

export type ClientInput = z.infer<typeof clientSchema>;
```

### Schema Usage

```typescript
// Validate in API route
const result = clientSchema.safeParse(body);
if (!result.success) {
  return Response.json({ errors: result.error.format() }, { status: 400 });
}

// Validate in component
const [errors, setErrors] = useState<Record<string, string>>({});

const validate = (data: ClientInput) => {
  const result = clientSchema.safeParse(data);
  if (!result.success) {
    const formatted = result.error.format();
    setErrors({
      name: formatted.name?._errors[0] || '',
      address: formatted.address?._errors[0] || '',
    });
    return false;
  }
  setErrors({});
  return true;
};
```

### Complex Schemas

Route form with nested validation and transforms.

```typescript
const routeSchema = z.object({
  name: z.string().min(1),
  startAddress: z.string().min(5),
  startDatetime: z.string().datetime(),
  endAddress: z.string().min(5),
  endDatetime: z.string().datetime(),
  visitDuration: z.number().min(5).max(120).default(30),
}).refine(
  (data) => new Date(data.endDatetime) > new Date(data.startDatetime),
  { message: 'End must be after start', path: ['endDatetime'] }
);
```

## Form State Management

### Client Component Pattern

```typescript
'use client';

export function ClientForm({ onSuccess }: { onSuccess?: () => void }) {
  const [formData, setFormData] = useState<ClientInput>({
    name: '',
    address: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientSchema.safeParse(formData).success) {
      // Handle validation errors
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const { errors } = await response.json();
        setErrors(errors);
        return;
      }

      toast.success('Client created');
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to create client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

### Controlled Inputs

Update state on every keystroke for real-time validation.

```typescript
const handleChange = (field: keyof ClientInput) => (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  setFormData(prev => ({ ...prev, [field]: e.target.value }));
  // Clear error on change
  if (errors[field]) {
    setErrors(prev => ({ ...prev, [field]: '' }));
  }
};
```

### File Upload State

CSV import with progress tracking.

```typescript
const [file, setFile] = useState<File | null>(null);
const [uploading, setUploading] = useState(false);
const [progress, setProgress] = useState(0);

const handleUpload = async () => {
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  setUploading(true);
  try {
    const response = await fetch('/api/clients/import', {
      method: 'POST',
      body: formData,
    });
    const result = await response.json();
    toast.success(`Imported ${result.imported} clients`);
  } finally {
    setUploading(false);
  }
};
```

## Input Components

### Text Input

```typescript
interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
}

export function TextInput({ label, value, onChange, error, required, placeholder }: TextInputProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-md ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
```

### Datetime Input

```typescript
export function DatetimeInput({ label, value, onChange, error }: InputProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium">{label}</label>
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2 border rounded-md ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
```

### File Input

```typescript
export function FileInput({ label, accept, onChange, error }: FileInputProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium">{label}</label>
      <input
        type="file"
        accept={accept}
        onChange={(e) => onChange(e.target.files?.[0] || null)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
```

### Number Input with Range

```typescript
export function NumberInput({ label, value, onChange, min, max, error }: NumberInputProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium">
        {label} ({min}-{max} min)
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        className={`w-full px-3 py-2 border rounded-md ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
```

## Error Display Patterns

### Inline Field Errors

Show errors directly below each input field (preferred pattern).

```typescript
{error && <p className="text-sm text-red-500">{error}</p>}
```

### Form-Level Errors

Display general submission errors at top of form.

```typescript
{submitError && (
  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
    <p className="text-sm text-red-600">{submitError}</p>
  </div>
)}
```

### Toast Notifications

Use Sonner for success/error feedback after submission.

```typescript
import { toast } from 'sonner';

// Success
toast.success('Route created successfully');

// Error with details
toast.error('Failed to geocode address', {
  description: 'Please check the address format',
});

// Promise-based
toast.promise(
  submitForm(),
  {
    loading: 'Creating route...',
    success: 'Route created!',
    error: 'Failed to create route',
  }
);
```

### Validation Error Formatting

Convert Zod errors to field-level messages.

```typescript
const formatZodErrors = (error: z.ZodError) => {
  const formatted: Record<string, string> = {};
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    formatted[path] = err.message;
  });
  return formatted;
};

// Usage
const result = schema.safeParse(data);
if (!result.success) {
  setErrors(formatZodErrors(result.error));
}
```

## Form Submission Patterns

### Standard API Submission

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  const result = schema.safeParse(formData);
  if (!result.success) {
    setErrors(formatZodErrors(result.error));
    return;
  }

  setLoading(true);
  try {
    const response = await fetch('/api/routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.data),
    });

    if (!response.ok) {
      const { error } = await response.json();
      throw new Error(error);
    }

    const data = await response.json();
    toast.success('Route created');
    onSuccess?.(data);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed');
  } finally {
    setLoading(false);
  }
};
```

### FormData Submission (File Upload)

```typescript
const handleImport = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/clients/import', {
    method: 'POST',
    body: formData, // No Content-Type header
  });

  const result = await response.json();

  if (result.failed.length > 0) {
    toast.warning(`Imported ${result.imported}, ${result.failed.length} failed`);
  } else {
    toast.success(`Imported ${result.imported} clients`);
  }
};
```

### Optimistic Update

Update UI immediately, revert on error.

```typescript
const handleToggle = async (clientId: string, isActive: boolean) => {
  // Optimistic update
  setClients(prev =>
    prev.map(c => c.id === clientId ? { ...c, is_active: !isActive } : c)
  );

  try {
    await fetch(`/api/clients/${clientId}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: !isActive }),
    });
  } catch {
    // Revert on error
    setClients(prev =>
      prev.map(c => c.id === clientId ? { ...c, is_active: isActive } : c)
    );
    toast.error('Failed to update client');
  }
};
```

### Server-Side Validation Response

API route returns structured errors.

```typescript
// app/api/clients/route.ts
const result = clientSchema.safeParse(body);
if (!result.success) {
  return Response.json(
    { errors: formatZodErrors(result.error) },
    { status: 400 }
  );
}

// Client handles field errors
const response = await fetch('/api/clients', { method: 'POST', body });
if (!response.ok) {
  const { errors } = await response.json();
  setErrors(errors); // Maps to field names
}
```

## Form Flows

### Client Import Flow

1. User selects CSV file
2. File validated (extension, size)
3. Upload to @app/api/clients/import
4. Server parses CSV with PapaParse
5. Server geocodes addresses via @app/api/geocode
6. Server bulk inserts to Supabase
7. Returns success count + failed rows
8. UI shows toast with results
9. Refresh client list

### Route Creation Flow

1. User fills route form (name, start, end, times)
2. Client validates with `routeSchema`
3. Submit to @app/api/routes
4. Server validates + creates route record
5. Server fetches suggested clients via spatial query
6. Returns route ID + suggestions
7. UI navigates to route detail page
8. User selects clients to include
9. Submit selections to @app/api/routes/optimize
10. Server calls Google Routes API
11. Returns optimized sequence
12. UI displays on map

### Address Geocoding Flow

1. User enters address in text input
2. Debounce onChange (500ms)
3. Call @app/api/geocode
4. Server uses Google Geocoding API
5. Returns lat/lng + formatted address
6. Auto-fill coordinates in form
7. Show validation checkmark
8. Store geocoded data on submit

## Form State Persistence

### Draft Saving

Auto-save form to localStorage.

```typescript
const [formData, setFormData] = useState<RouteInput>(() => {
  const saved = localStorage.getItem('route-draft');
  return saved ? JSON.parse(saved) : initialState;
});

useEffect(() => {
  localStorage.setItem('route-draft', JSON.stringify(formData));
}, [formData]);

const handleSubmit = async () => {
  // ... submit logic
  localStorage.removeItem('route-draft'); // Clear on success
};
```

### URL State

Persist filters/pagination in URL.

```typescript
const searchParams = useSearchParams();
const router = useRouter();

const updateFilter = (key: string, value: string) => {
  const params = new URLSearchParams(searchParams);
  params.set(key, value);
  router.push(`/dashboard/clients?${params.toString()}`);
};
```

## Accessibility

- Use semantic HTML (`<form>`, `<label>`, `<button>`)
- Associate labels with inputs via `htmlFor`
- Add `aria-invalid` on error fields
- Show error messages in `aria-describedby`
- Disable submit button during loading
- Focus first error field on validation fail

```typescript
<label htmlFor="client-name">Client Name</label>
<input
  id="client-name"
  aria-invalid={!!errors.name}
  aria-describedby={errors.name ? 'name-error' : undefined}
/>
{errors.name && <p id="name-error">{errors.name}</p>}
```
