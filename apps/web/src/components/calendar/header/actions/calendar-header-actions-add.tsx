import { Button } from '@workspace/ui/components/button'
import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import { useCalendarContext } from '../../calendar-context'

export default function CalendarHeaderActionsAdd() {
  const { service, dialogControl } = useCalendarContext()

  // Only show add button if user can create events
  const canPerform = useMemo(() => service.canPerformAction('create'), [service])
  if (!canPerform) {
    return null
  }

  return (
    <Button
      className="flex items-center gap-1 bg-primary text-background"
      onClick={() => dialogControl.show({ mode: 'create' })}
    >
      <Plus />
      Add Event
    </Button>
  )
}
