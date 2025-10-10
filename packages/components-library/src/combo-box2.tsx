"use client";

import { PopoverClose } from "@radix-ui/react-popover";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { useDebounce } from "@workspace/ui/hooks/use-debounce";
import { cn } from "@workspace/ui/lib/utils";
import { Check, ChevronsUpDown, Edit, LoaderIcon, Plus, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type BadgeRenderType = "inside" | "outside";

interface Props<T extends object> {
  title?: string;
  valueKey: keyof T;
  multiple?: boolean;
  disabled?: boolean;
  size?: number;
  renderLabel: (value: T) => string | React.ReactNode;
  searchFn: (search: string, offset: number, size: number) => Promise<T[]>;
  onCreateClick?: () => void;
  onEditClick?: (item: T) => void;
  showCreateButton?: boolean;
  showEditButton?: boolean;
  badgeRenderType?: BadgeRenderType;
}

type PropsMultiple<T extends object> = Props<T> & {
  value?: T[];
  multiple: true;
  onChange?: (value: T[]) => void;
};

type PropsSingle<T extends object> = Props<T> & {
  value?: T;
  multiple: false;
  onChange?: (value: T) => void;
};

const ComboBox2 = <T extends object>({
  title,
  value,
  valueKey,
  multiple = false,
  disabled = false,
  size = 25,
  renderLabel,
  onChange,
  searchFn,
  onCreateClick,
  onEditClick,
  showCreateButton = false,
  showEditButton = false,
  badgeRenderType = "inside",
}: PropsMultiple<T> | PropsSingle<T>) => {
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<T[]>([]);
  const [canLoadMore, setCanLoadMore] = useState(true);
  const debouncedSearch = useDebounce(search, 500);
  const [isLoading, setIsLoading] = useState(false);

  const getOptions = useCallback(async () => {
    setIsLoading(true);
    const searchResult = await searchFn(debouncedSearch || "", 0, size);
    setCanLoadMore(searchResult.length >= size);
    setOptions(searchResult);
    setIsLoading(false);
  }, [debouncedSearch, searchFn, size]);

  const getMoreOptions = useCallback(async () => {
    setIsLoading(true);
    const searchResult = await searchFn(debouncedSearch || "", options.length, size);
    setCanLoadMore(searchResult.length >= size);
    if (searchResult[searchResult.length - 1]?.[valueKey] === options[options.length - 1]?.[valueKey]) {
      setCanLoadMore(false);
      setIsLoading(false);
      return;
    }
    setOptions([...options, ...searchResult]);
    setIsLoading(false);
  }, [debouncedSearch, searchFn, options, valueKey, size]);

  const handleSelect = useCallback(
    (option: T) => {
      if (multiple) {
        const current = Array.isArray(value) ? value : [];
        const exists = current.some((v) => v[valueKey] === option[valueKey]);
        const newValue = exists
          ? current.filter((v) => v[valueKey] !== option[valueKey])
          : [...current, option];
        (onChange as any)?.(newValue);
      } else {
        (onChange as any)?.(option);
      }
    },
    [multiple, value, valueKey, onChange],
  );

  const handleRemoveItem = useCallback((item: T) => {
    if (multiple) {
      const current = Array.isArray(value) ? value : [];
      const newValue = current.filter((v) => v[valueKey] !== item[valueKey]);
      onChange?.(newValue as any);
    }
  }, [multiple, value, valueKey, onChange]);

  const handleClear = useCallback(() => {
    if (multiple) {
      onChange?.([] as any);
    } else {
      onChange?.(undefined as any);
    }
  }, [multiple, onChange]);

  useEffect(() => {
    getOptions();
  }, [getOptions]);

  const selectedValues = useMemo(() => {
    if (multiple && Array.isArray(value)) {
      return value;
    }
    return [];
  }, [multiple, value]);

  return (
    <div className="space-y-2">
      <Popover modal={true}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Button
              variant="outline"
              className={cn(
                "w-full justify-between pr-20",
                (!value || (Array.isArray(value) && value.length === 0)) && "text-muted-foreground",
              )}
              type="button"
              disabled={disabled}
            >
              <div className="truncate flex-1 text-left">
                {multiple && badgeRenderType === "inside" ? (
                  Array.isArray(value) && value.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {value.map((item) => (
                        <Badge
                          key={String(item[valueKey])}
                          variant="secondary"
                          className="text-xs"
                        >
                          {renderLabel(item)}
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveItem(item);
                            }}
                            className="ml-1 hover:text-destructive cursor-pointer"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation();
                                handleRemoveItem(item);
                              }
                            }}
                          >
                            ×
                          </span>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    `${title}`
                  )
                ) : multiple ? (
                  Array.isArray(value) && value.length > 0
                    ? `${value.length} selected`
                    : `${title}`
                ) : value ? (
                  renderLabel(value as T)
                ) : (
                  `${title}`
                )}
              </div>
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>

            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {value && onEditClick && !multiple && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-muted"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!Array.isArray(value)) {
                      onEditClick(value);
                    }
                  }}
                  title="Edit selected item"
                >
                  <Edit className="h-3 w-3" />
                </Button>
              )}

              {value && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-muted"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                  title="Clear selection"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="PopoverContent p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={`Search...`}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No item found.</CommandEmpty>
              <CommandGroup className="max-h-60 overflow-y-auto">
                {/* Create button */}
                {showCreateButton && onCreateClick && (
                  <PopoverClose asChild>
                    <CommandItem
                      onSelect={onCreateClick}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                      Create New
                    </CommandItem>
                  </PopoverClose>
                )}

                {options.map((option) => (
                  <CommandItem
                    value={String(option[valueKey])}
                    key={String(option[valueKey])}
                    onSelect={() => handleSelect(option)}
                    className="flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2">
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          multiple
                            ? Array.isArray(value) && value.some((v) => v[valueKey] === option[valueKey])
                              ? "opacity-100"
                              : "opacity-0"
                            : option[valueKey] === (value as T)?.[valueKey]
                              ? "opacity-100"
                              : "opacity-0",
                        )}
                      />
                      <div className="flex-1">
                        {renderLabel(option)}
                      </div>
                    </div>

                    {showEditButton && onEditClick && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditClick(option);
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                  </CommandItem>
                ))}

                {canLoadMore && (
                  <CommandItem asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      className="w-full h-7"
                      onClick={getMoreOptions}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <LoaderIcon className="w-4 h-4 animate-spin" />
                      ) : (
                        "Load More ↓"
                      )}
                    </Button>
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Outside badge rendering for multiple selection */}
      {multiple && badgeRenderType === "outside" && selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedValues.map((item) => (
            <Badge
              key={String(item[valueKey])}
              variant="secondary"
              className="flex items-center gap-1"
            >
              {renderLabel(item)}
              <span
                onClick={() => handleRemoveItem(item)}
                className="ml-1 hover:text-destructive cursor-pointer"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleRemoveItem(item);
                  }
                }}
              >
                ×
              </span>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default ComboBox2;
