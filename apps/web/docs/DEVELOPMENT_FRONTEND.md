# Frontend Development Guide

This document outlines the coding standards, patterns, and best practices for frontend development. Use this as a reference when implementing new features or refactoring existing code.

> **Note for AI Assistants**: This guide uses generic examples (`item`, `module`, `submodule`) to demonstrate patterns. Replace these placeholders with actual entity names from the codebase when implementing features.

## Table of Contents
- [tRPC Usage Patterns](#trpc-usage-patterns)
- [Form Components](#form-components)
- [Dialog Management](#dialog-management)
- [Component Library Components](#component-library-components)
  - [ComboBox2](#combobox2)
  - [MediaSelector](#mediaselector)
  - [MediaBrowser](#mediabrowser)
- [State Management](#state-management)
- [Component Structure](#component-structure)
- [TypeScript Patterns](#typescript-patterns)
- [Code Organization](#code-organization)

---

## tRPC Usage Patterns

### ✅ Query Naming Convention

**DO**: Use descriptive variable names with `Query` suffix for queries
```typescript
// ✅ Good - Clear and descriptive
const loadItemQuery = trpc.module.submodule.item.getById.useQuery(
  { id: itemId },
  { enabled: !!itemId }
);

const loadListQuery = trpc.module.submodule.item.list.useQuery(queryParams);
const loadStatsQuery = trpc.module.submodule.item.getStats.useQuery();
```

**DON'T**: Destructure data directly or use generic names
```typescript
// ❌ Bad - Too generic, loses context
const { data, isLoading } = trpc.item.getById.useQuery({ id });

// ❌ Bad - Unclear what's being loaded
const query = trpc.item.getById.useQuery({ id });
```

### ✅ Mutation Naming Convention

**DO**: Use descriptive variable names with `Mutation` suffix
```typescript
// ✅ Good - Clear action intent
const updateItemMutation = trpc.module.submodule.item.update.useMutation({
  onSuccess: () => {
    toast({ title: "Success", description: "Item updated successfully" });
    loadItemQuery.refetch();
  },
  onError: (error) => {
    toast({ title: "Error", description: error.message, variant: "destructive" });
  },
});

const deleteItemMutation = trpc.module.submodule.item.delete.useMutation();
const createItemMutation = trpc.module.submodule.item.create.useMutation();
```

**DON'T**: Use short names or unwrap mutations
```typescript
// ❌ Bad - Too generic
const mutation = trpc.item.update.useMutation();

// ❌ Bad - Unclear intent
const update = trpc.item.update.useMutation();
```

### ✅ No API Unwrapping

**DO**: Call tRPC methods directly without unwrapping
```typescript
// ✅ Good - Direct tRPC calls
const loadItemQuery = trpc.module.submodule.item.getById.useQuery({ id });
const updateMutation = trpc.module.submodule.item.update.useMutation();
```

**DON'T**: Unwrap API objects (old pattern, avoid)
```typescript
// ❌ Bad - Don't unwrap APIs
const itemApi = trpc.module.submodule.item;
const loadItemQuery = itemApi.getById.useQuery({ id });
```

### ✅ Using tRPC Utils

**DO**: Use `trpcUtils` for manual fetching and invalidation
```typescript
const trpcUtils = trpc.useUtils();

// Fetch data manually
const items = await trpcUtils.module.submodule.item.list.fetch({
  pagination: { skip: 0, take: 10 }
});

// Invalidate queries
await trpcUtils.module.submodule.item.list.invalidate();
```

### ✅ Query Options

**DO**: Use query options for better control
```typescript
// ✅ Good - Enable only when needed
const loadItemQuery = trpc.module.submodule.item.getById.useQuery(
  { id: itemId },
  { 
    enabled: !!itemId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  }
);
```

### ✅ Accessing Query Data

**DO**: Access data from the query object
```typescript
const loadItemQuery = trpc.module.submodule.item.getById.useQuery({ id });

if (loadItemQuery.isLoading) return <LoadingState />;
if (!loadItemQuery.data) return <NotFound />;

const item = loadItemQuery.data;
```

---

## Form Components

### ✅ Use `workspace/ui` Field Components

**DO**: Use Field components from `@workspace/ui`
```typescript
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Controller } from "react-hook-form";

// ✅ Good - Consistent field components
<Controller
  name="title"
  control={form.control}
  render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel>Title</FieldLabel>
      <Input
        {...field}
        placeholder="Enter title"
        aria-invalid={fieldState.invalid}
      />
      {fieldState.invalid && (
        <FieldError errors={[fieldState.error]} />
      )}
    </Field>
  )}
/>
```

**DON'T**: Use shadcn Form components
```typescript
// ❌ Bad - Don't use shadcn Form components
import { Form, FormField, FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

<FormField
  control={form.control}
  name="title"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Title</FormLabel>
      <FormControl>
        <Input {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### ✅ Form Structure

**DO**: Use react-hook-form with zod validation
```typescript
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const FormSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  status: z.enum(["active", "inactive"]),
});

type FormDataType = z.infer<typeof FormSchema>;

export function MyForm() {
  const form = useForm<FormDataType>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "active",
    },
  });

  const handleSubmit = useCallback(async (data: FormDataType) => {
    await updateMutation.mutateAsync({ data });
  }, [updateMutation]);

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      <FieldGroup>
        {/* Form fields here */}
      </FieldGroup>
    </form>
  );
}
```

### ✅ Prevent Accidental Form Submissions

**DO**: Prevent Enter key submissions from rich text editors
```typescript
<form 
  onSubmit={form.handleSubmit(handleSubmit)}
  onKeyDown={(e) => {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
      e.preventDefault();
    }
  }}
>
  {/* Form content */}
</form>
```

**DO**: Use `type="button"` for non-submit buttons
```typescript
// ✅ Good - Explicit button type
<Button type="button" onClick={handleCancel}>
  Cancel
</Button>

<Button type="submit" disabled={isSubmitting}>
  Save
</Button>
```

---

## Dialog Management

### ✅ Use NiceModal Pattern

**DO**: Use NiceModal for all dialogs
```typescript
import { NiceModal, DeleteConfirmNiceDialog } from "@workspace/components-library";

// ✅ Good - Clean, consistent dialog usage
const handleDelete = useCallback(async (item) => {
  const result = await NiceModal.show(DeleteConfirmNiceDialog, {
    title: "Delete Item",
    message: `Are you sure you want to delete "${item.title}"?`,
  });

  if (result.reason === "confirm") {
    await deleteMutation.mutateAsync({ id: item._id });
  }
}, [deleteMutation]);
```

**DON'T**: Use `useDialogControl` or shadcn Dialog components
```typescript
// ❌ Bad - Avoid useDialogControl
const dialogControl = useDialogControl();

<Dialog open={dialogControl.isVisible} onOpenChange={dialogControl.hide}>
  <DialogContent>
    {/* Dialog content */}
  </DialogContent>
</Dialog>
```

### ✅ Creating Custom NiceModal Dialogs

**DO**: Create reusable dialogs with NiceModal.create
```typescript
import { NiceModal, NiceModalHocProps, FormDialog } from "@workspace/components-library";

interface MyDialogProps extends NiceModalHocProps {
  itemId?: string;
}

export const MyCustomDialog = NiceModal.create<
  MyDialogProps,
  { reason: "cancel" | "submit"; data?: any }
>(({ itemId }) => {
  const { visible, hide, resolve } = NiceModal.useModal();
  const { toast } = useToast();

  const handleSubmit = useCallback(async (data) => {
    // Handle submission
    resolve({ reason: "submit", data });
    hide();
  }, [resolve, hide]);

  return (
    <FormDialog
      open={visible}
      onOpenChange={(open) => {
        if (!open) {
          hide();
          resolve({ reason: "cancel" });
        }
      }}
      title="Dialog Title"
      onSubmit={handleSubmit}
      onCancel={() => {
        resolve({ reason: "cancel" });
        hide();
      }}
    >
      {/* Dialog content */}
    </FormDialog>
  );
});
```

### ✅ Using NiceModal Dialogs

**DO**: Show dialogs and handle results
```typescript
const handleCreate = useCallback(async () => {
  const result = await NiceModal.show(MyCustomDialog, { 
    itemId: courseId 
  });
  
  if (result.reason === "submit") {
    // Handle success
    loadListQuery.refetch();
  }
}, [courseId, loadListQuery]);
```

---

## Component Library Components

The `@workspace/components-library` package provides reusable, consistent components for common UI patterns.

### ComboBox2

ComboBox2 is a searchable, async-loading dropdown component for selecting items from large datasets.

#### ✅ Basic Usage

**DO**: Use ComboBox2 for async searchable dropdowns
```typescript
import { ComboBox2 } from "@workspace/components-library";
import { trpc } from "@/utils/trpc";

type ItemType = {
  _id: string;
  title: string;
};

export function ItemSelector() {
  const trpcUtils = trpc.useUtils();
  
  const searchItems = useCallback(
    async (search: string, offset: number, size: number): Promise<ItemType[]> => {
      const result = await trpcUtils.module.submodule.item.list.fetch({
        pagination: { skip: offset, take: size },
        search: search ? { q: search } : undefined,
      });
      return result.items.map(item => ({ 
        _id: item._id, 
        title: item.title 
      }));
    },
    [trpcUtils]
  );

  return (
    <Controller
      name="itemId"
      control={form.control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel>Select Item</FieldLabel>
          <ComboBox2<ItemType>
            title="Select item"
            valueKey="_id"
            value={field.value ? { _id: field.value, title: "" } : undefined}
            searchFn={searchItems}
            renderLabel={(item) => item.title}
            onChange={(item) => field.onChange(item?._id || "")}
            multiple={false}
          />
          {fieldState.invalid && (
            <FieldError errors={[fieldState.error]} />
          )}
        </Field>
      )}
    />
  );
}
```

#### ✅ Multiple Selection

**DO**: Enable multiple selection when needed
```typescript
<ComboBox2<ThemeItem>
  title="Select themes"
  valueKey="key"
  value={selectedThemes}
  searchFn={searchThemes}
  renderLabel={(item) => item.title}
  onChange={(items) => setSelectedThemes(items)}
  multiple={true} // Enable multiple selection
/>
```

#### ✅ Key Features

- **Async Search**: Fetches data on-demand as user types
- **Pagination**: Handles large datasets efficiently
- **TypeScript Generic**: Type-safe item selection
- **valueKey**: Specify which field to use as the unique identifier
- **renderLabel**: Customize how items are displayed
- **multiple**: Support for single or multiple selection

---

### MediaSelector

MediaSelector is a component for uploading, selecting, and removing media files (images, videos, documents).

#### ✅ Basic Usage

**DO**: Use MediaSelector for file uploads
```typescript
import { MediaSelector } from "@workspace/components-library";
import { IAttachmentMedia } from "@workspace/common-logic/models/media.types";
import { uploadItemImage, removeItemImage } from "@/server/actions/item/media";

export function ImageUploader({ itemId }: { itemId: string }) {
  const [image, setImage] = useState<IAttachmentMedia | null>(null);

  return (
    <MediaSelector
      media={image}
      onSelection={(media) => {
        if (media) {
          setImage(media);
        }
      }}
      functions={{
        uploadFile: async (formData: FormData) => {
          const result = await uploadItemImage(itemId, formData);
          return result;
        },
        removeFile: async (mediaId: string) => {
          await removeItemImage(itemId);
          setImage(null);
        },
      }}
    />
  );
}
```

#### ✅ With Server Actions

**DO**: Integrate with server actions for media operations
```typescript
// Server action: apps/web/src/server/actions/{entity}/media.ts
export async function uploadItemImage(
  itemId: string,
  formData: FormData
): Promise<IAttachmentMedia> {
  "use server";
  
  const file = formData.get("file") as File;
  
  // Upload to storage
  const uploadResult = await uploadToCloudinary(file, {
    folder: `items/${itemId}`,
  });
  
  // Update item with new image
  await ItemModel.updateOne(
    { _id: itemId },
    { image: uploadResult }
  );
  
  return uploadResult;
}

export async function removeItemImage(itemId: string): Promise<void> {
  "use server";
  
  const item = await ItemModel.findById(itemId);
  if (item?.image?.mediaId) {
    await deleteFromCloudinary(item.image.mediaId);
  }
  
  await ItemModel.updateOne(
    { _id: itemId },
    { $set: { image: null } }
  );
}
```

#### ✅ Key Features

- **Upload**: Handles file upload with progress
- **Preview**: Shows thumbnail of selected media
- **Remove**: Deletes media with confirmation
- **Server Integration**: Works with server actions for secure uploads
- **Type Support**: Images, videos, documents
- **Access Control**: Optional public/private access settings

**Important**: Always use the `functions` prop pattern:
```typescript
functions={{
  uploadFile: async (formData) => { /* upload logic */ },
  removeFile: async (mediaId) => { /* remove logic */ },
}}
```

---

### MediaBrowser

MediaBrowser is a modal dialog for browsing, uploading, and selecting media from your media library.

#### ✅ Basic Usage

**DO**: Use MediaBrowser via NiceModal for media selection
```typescript
import { NiceModal, MediaBrowserNiceDialog } from "@workspace/components-library";
import type { IAttachmentMedia } from "@workspace/common-logic/models/media.types";

export function MyComponent() {
  const [selectedMedia, setSelectedMedia] = useState<IAttachmentMedia | null>(null);

  const handleSelectMedia = useCallback(async () => {
    const result = await NiceModal.show(MediaBrowserNiceDialog, {
      config: {
        title: "Select Media",
        mediaTypes: ["image"], // Filter by type
        selectionMode: "single", // or "multiple"
      },
    });

    if (result.reason === "select" && result.data) {
      setSelectedMedia(result.data[0]); // Get first selected item
    }
  }, []);

  return (
    <div>
      <Button onClick={handleSelectMedia}>
        Browse Media Library
      </Button>
      
      {selectedMedia && (
        <img src={selectedMedia.file} alt={selectedMedia.originalFileName} />
      )}
    </div>
  );
}
```

#### ✅ Multiple Selection

**DO**: Enable multiple media selection
```typescript
const handleSelectMultiple = useCallback(async () => {
  const result = await NiceModal.show(MediaBrowserNiceDialog, {
    config: {
      title: "Select Images",
      mediaTypes: ["image"],
      selectionMode: "multiple",
      maxSelection: 5, // Optional limit
    },
  });

  if (result.reason === "select" && result.data) {
    setSelectedImages(result.data);
  }
}, []);
```

#### ✅ Media Type Filtering

**DO**: Filter by specific media types
```typescript
// Images only
config: {
  mediaTypes: ["image"],
}

// Videos only
config: {
  mediaTypes: ["video"],
}

// Documents only
config: {
  mediaTypes: ["document"],
}

// Multiple types
config: {
  mediaTypes: ["image", "video"],
}

// All types
config: {
  mediaTypes: ["image", "video", "document", "audio"],
}
```

#### ✅ Key Features

- **Browse Library**: View all uploaded media
- **Upload**: Upload new files directly from browser
- **Search**: Search media by filename
- **Filter**: Filter by media type
- **Selection Modes**: Single or multiple selection
- **Preview**: Preview media before selection
- **Delete**: Remove media from library
- **Pagination**: Handle large media libraries

#### ✅ Integration with Forms

**DO**: Integrate MediaBrowser with form fields
```typescript
<Controller
  name="images"
  control={form.control}
  render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel>Gallery Images</FieldLabel>
      
      <div className="space-y-4">
        {/* Display selected images */}
        {field.value?.length > 0 && (
          <div className="grid grid-cols-4 gap-4">
            {field.value.map((img, idx) => (
              <div key={idx} className="relative">
                <img src={img.thumbnail || img.file} alt={img.originalFileName} />
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => {
                    const newImages = field.value.filter((_: any, i: number) => i !== idx);
                    field.onChange(newImages);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        
        {/* Browse button */}
        <Button
          type="button"
          onClick={async () => {
            const result = await NiceModal.show(MediaBrowserNiceDialog, {
              config: {
                title: "Select Images",
                mediaTypes: ["image"],
                selectionMode: "multiple",
              },
            });
            
            if (result.reason === "select" && result.data) {
              field.onChange([...(field.value || []), ...result.data]);
            }
          }}
        >
          Browse Media Library
        </Button>
      </div>
      
      {fieldState.invalid && (
        <FieldError errors={[fieldState.error]} />
      )}
    </Field>
  )}
/>
```

---

## State Management

### ✅ React Context for Shared Data

**DO**: Use React Context for data that needs to be shared across multiple components
```typescript
// _components/item-context.tsx
"use client";

import React, { createContext, useContext } from "react";
import { SerializedItem } from "./types";

interface ItemContextType {
  item: SerializedItem | null;
  isLoading: boolean;
  refetch: () => void;
}

const ItemContext = createContext<ItemContextType | undefined>(undefined);

export function ItemProvider({ children, value }: {
  children: React.ReactNode;
  value: ItemContextType;
}) {
  return (
    <ItemContext.Provider value={value}>
      {children}
    </ItemContext.Provider>
  );
}

export function useItemContext() {
  const context = useContext(ItemContext);
  if (context === undefined) {
    throw new Error("useItemContext must be used within an ItemProvider");
  }
  return context;
}
```

**DO**: Provide context in layouts
```typescript
// layout.tsx
export default function ItemLayout({ children }) {
  const params = useParams<{ id: string }>();
  
  const loadItemQuery = trpc.module.submodule.item.getById.useQuery(
    { id: params.id },
    { 
      enabled: !!params.id,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    }
  );

  return (
    <ItemProvider
      value={{
        item: loadItemQuery.data ?? null,
        isLoading: loadItemQuery.isLoading,
        refetch: loadItemQuery.refetch,
      }}
    >
      {children}
    </ItemProvider>
  );
}
```

**DO**: Consume context in child components
```typescript
// page.tsx
export default function ItemPage() {
  const { item, isLoading, refetch } = useItemContext();

  if (isLoading) return <LoadingSkeleton />;
  if (!item) return <NotFound />;

  return <div>{item.title}</div>;
}
```

### ✅ Local State for Component-Specific Data

**DO**: Use useState for component-specific state
```typescript
const [isEnabled, setIsEnabled] = useState<boolean>(item?.enabled || false);
const [isPublic, setIsPublic] = useState<boolean>(item?.public || false);

// Update state and call mutation
const updateEnabled = async (checked: boolean) => {
  try {
    await updateItemMutation.mutateAsync({
      id: item._id,
      data: { enabled: checked },
    });
    setIsEnabled(checked);
  } catch (error) {
    console.error("Error updating enabled:", error);
  }
};
```

---

## Component Structure

### ✅ Client Components

**DO**: Mark client components with "use client" directive
```typescript
"use client";

import { useState, useCallback } from "react";
import { trpc } from "@/utils/trpc";

export default function MyClientComponent() {
  // Component logic
}
```

### ✅ Component Organization

**DO**: Organize components with clear file structure
```
items/
├── [id]/
│   ├── _components/
│   │   ├── item-context.tsx         # Context provider
│   │   ├── item-sidebar.tsx         # Shared sidebar
│   │   └── types.ts                 # Serialized types
│   ├── layout.tsx                   # Layout with context
│   ├── page.tsx                     # Overview page
│   ├── edit/
│   │   └── page.tsx
│   ├── details/
│   │   ├── layout.tsx               # Nested layout
│   │   └── page.tsx
│   └── related/
│       └── page.tsx
```

### ✅ Data Serialization

**DO**: Define serialized types for client-side data
```typescript
// _components/types.ts
import { GeneralRouterOutputs } from "@/server/api/types";

type ItemType = GeneralRouterOutputs["module"]["submodule"]["item"]["getById"];

export type SerializedItem = Omit<ItemType, "relations" | "owner"> & {
  relations: SerializedRelation[];
  owner: {
    _id: string;
    username: string;
    fullName: string;
  };
};

export type SerializedRelation = Omit<
  NonNullable<ItemType>["relations"][number],
  "_id"
> & {
  _id: string;
};
```

---

## TypeScript Patterns

### ✅ Type Inference from tRPC

**DO**: Infer types from tRPC router outputs
```typescript
import { GeneralRouterOutputs } from "@/server/api/types";

type ItemType = GeneralRouterOutputs["module"]["submodule"]["item"]["list"]["items"][number];
type QueryParams = Parameters<typeof trpc.module.submodule.item.list.useQuery>[0];
```

### ✅ Zod Schema Inference

**DO**: Infer form types from Zod schemas
```typescript
const ItemSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  categoryId: z.string().min(1, "Category is required"),
  status: z.nativeEnum(ItemStatusEnum),
});

type ItemFormDataType = z.infer<typeof ItemSchema>;
```

### ✅ Proper Type Guards

**DO**: Use type guards for safe data access
```typescript
if (loadItemQuery.isLoading) {
  return <LoadingSkeleton />;
}

if (!loadItemQuery.data) {
  return <NotFound />;
}

const item = loadItemQuery.data; // Type is now safe to use
```

---

## Code Organization

### ✅ Index Files

**IMPORTANT**: Do NOT create index.ts/index.tsx files unless explicitly requested by the user.

**DON'T**: Automatically create index files for components or modules
```typescript
// ❌ Bad - Don't create index.ts automatically
// components/my-component/index.ts
export { MyComponent } from "./my-component";
export type { MyComponentProps } from "./types";
```

**DO**: Import directly from the file
```typescript
// ✅ Good - Import directly from source files
import { MyComponent } from "@/components/my-component/my-component";
import type { MyComponentProps } from "@/components/my-component/types";

// ✅ Also good - Use type keyword for type-only imports
import type { ScheduleEventData, TimeSlotClickData } from "@/components/dashboard/calendar/types";
```

**Exceptions**: Only create index files when:
- User explicitly requests it
- It's part of a published package (like @workspace packages)
- It's an existing pattern in the codebase being maintained

### ✅ Import Organization

**DO**: Organize imports by category
```typescript
// External libraries
import { useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Internal utilities
import { trpc } from "@/utils/trpc";
import { useCourseContext } from "../_components/course-context";

// Component library
import { NiceModal, DeleteConfirmNiceDialog, useToast } from "@workspace/components-library";

// UI components
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";

// Icons
import { Trash2, Save, Plus } from "lucide-react";

// Types
import type { SerializedCourse } from "../_components/types";
```

### ✅ Component Logic Order

**DO**: Organize component logic in a consistent order
```typescript
export default function MyComponent() {
  // 1. Hooks - routing, context
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { course, refetch } = useCourseContext();
  
  // 2. Utilities
  const { toast } = useToast();
  const trpcUtils = trpc.useUtils();
  
  // 3. State
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  
  // 4. Queries
  const loadItemsQuery = trpc.items.list.useQuery(params);
  
  // 5. Mutations
  const updateMutation = trpc.items.update.useMutation({
    onSuccess: () => {
      toast({ title: "Success" });
      loadItemsQuery.refetch();
    },
  });
  
  // 6. Callbacks
  const handleUpdate = useCallback(async (data) => {
    await updateMutation.mutateAsync({ id: params.id, data });
  }, [updateMutation, params.id]);
  
  // 7. Effects
  useEffect(() => {
    // Side effects
  }, []);
  
  // 8. Memoized values
  const filteredItems = useMemo(() => {
    return items.filter(item => item.active);
  }, [items]);
  
  // 9. Render logic
  if (loadItemsQuery.isLoading) return <Loading />;
  if (!loadItemsQuery.data) return <NotFound />;
  
  return (
    <div>{/* Component JSX */}</div>
  );
}
```

### ✅ Callback Dependencies

**DO**: Include all dependencies in callback arrays
```typescript
const handleSubmit = useCallback(async (data: FormData) => {
  await updateMutation.mutateAsync({
    id: itemId,
    data: transformData(data),
  });
  await refetch();
}, [updateMutation, itemId, refetch]); // ✅ All dependencies listed
```

---

## Best Practices Summary

### tRPC
- ✅ Use `load...Query` naming for queries
- ✅ Use `...Mutation` naming for mutations
- ✅ No API unwrapping - call methods directly
- ✅ Use query options for better control
- ✅ Use `trpcUtils` for manual operations

### Forms
- ✅ Use `@workspace/ui/components/field` components
- ✅ Use `react-hook-form` with `zod` validation
- ✅ Use `Controller` for field rendering
- ✅ Prevent accidental form submissions

### Dialogs
- ✅ Use `NiceModal.show()` for all dialogs
- ✅ Use `DeleteConfirmNiceDialog` for confirmations
- ✅ Create custom dialogs with `NiceModal.create()`
- ❌ Don't use `useDialogControl` or shadcn Dialog

### State
- ✅ Use React Context for shared data across components
- ✅ Use `useState` for component-specific state
- ✅ Provide context in layouts, consume in pages

### TypeScript
- ✅ Infer types from tRPC outputs
- ✅ Infer form types from Zod schemas
- ✅ Use proper type guards

### Code Organization
- ✅ Organize imports by category
- ✅ Consistent component logic order
- ✅ Clear file structure with `_components` folders
- ✅ Define serialized types for client data
- ❌ **Do NOT create index.ts files unless explicitly requested**
- ✅ Import directly from source files
- ✅ Use `type` keyword for type-only imports

---

## Migration Checklist

When updating existing components:

- [ ] Rename queries to `load...Query` pattern
- [ ] Rename mutations to `...Mutation` pattern
- [ ] Remove API unwrapping
- [ ] Replace shadcn Form with `@workspace/ui/components/field`
- [ ] Replace `useDialogControl` with `NiceModal.show()`
- [ ] Add proper TypeScript types
- [ ] Organize imports consistently
- [ ] Use `type` keyword for type-only imports
- [ ] Import directly from source files (no index.ts)
- [ ] Add loading and error states
- [ ] Test all functionality

---

---

*This is a living document. Update it as new patterns and best practices emerge.*

