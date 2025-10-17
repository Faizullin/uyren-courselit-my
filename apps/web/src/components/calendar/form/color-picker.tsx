import { RadioGroup, RadioGroupItem } from "@workspace/ui/components/radio-group"
import { cn } from "@workspace/ui/lib/utils"
import { colorOptions } from "../calendar-tailwind-classes"

interface ColorPickerProps {
    field: {
      value: string
      onChange: (value: string) => void
    }
  }



export function ColorPicker({ field }: ColorPickerProps) {
    return (
      <RadioGroup   
        onValueChange={field.onChange}
        defaultValue={field.value}
        className="flex gap-2"
      >
        {colorOptions.map((color) => (
          <RadioGroupItem
            key={color.value}
            value={color.value}
            id={color.value}
            className={cn(
              'size-6 border-0 shadow-none transition-all duration-200',
              `bg-${color.value}-500`
            )}
            aria-label={color.label}
          />
        ))}
      </RadioGroup>
    )
  }