"use client";

import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { DragHandle } from "@workspace/icons";
import { FC, useEffect, useState } from "react";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@workspace/ui/lib/utils";

export function SortableItem({
  id,
  Renderer,
  rendererProps,
}: {
  id: number;
  Renderer: any;
  rendererProps: Record<string, unknown>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: id });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  return (
    <div
      {...attributes}
      ref={setNodeRef}
      style={style}
      className={cn("flex flex-col text-black dark:text-white", isDragging && "opacity-50")}
    >
      <div className="flex items-center gap-5">
        <button className="border border-gray-300 dark:border-gray-600 cursor-grab" {...listeners}>
          <DragHandle />
        </button>
        <Renderer {...rendererProps} />
      </div>
    </div>
  );
}

const DragAndDrop = <T extends { id: string }>({
  items,
  onChange,
  Renderer,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  Renderer: FC<T>;
}) => {
  const [data, setData] = useState<T[]>(items);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
    useSensor(MouseSensor, {
      // Require the mouse to move by 10 pixels before activating
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      // Press delay of 250ms, with tolerance of 5px of movement
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
  );

  const findPositionOfItems = (id: string) =>
    data.findIndex((item: T) => item.id === id);

  const handleDragEnd = (event: { active: any; over: any }) => {
    const { active, over } = event;

    if (active.id === over.id) return;
    setData((data: T[]) => {
      const originalPos = findPositionOfItems(active.id);
      const newPos = findPositionOfItems(over.id);
      return arrayMove(data, originalPos, newPos);
    });
  };

  useEffect(() => {
    if (onChange && JSON.stringify(data) !== JSON.stringify(items)) {
      onChange(data);
    }
  }, [data]);

  useEffect(() => {
    setData(items);
  }, [items]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={data.map((item: { id: any }) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        {data.map((item: any) => (
          <SortableItem
            key={item.id}
            id={item.id}
            rendererProps={item}
            Renderer={Renderer}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
};

export default DragAndDrop;
