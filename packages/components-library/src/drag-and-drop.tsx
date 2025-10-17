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

const DragAndDrop = <T extends { id: number }>({
  items,
  onChange,
  Renderer,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  Renderer: FC<T>;
}) => {
  const [data, setData] = useState<T[]>(items);
  const [isDragging, setIsDragging] = useState(false);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      // Only activate drag on the drag handle, not on other interactive elements
      activationConstraint: {
        distance: 8, // Require 8px movement to prevent accidental drags
      },
    }),
    useSensor(TouchSensor, {
      // Press delay to prevent interference with taps/clicks
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const findPositionOfItems = (id: number) =>
    data.findIndex((item: T) => item.id === id);

  const handleDragEnd = (event: { active: any; over: any }) => {
    const { active, over } = event;

    if (active.id === over.id) {
      setIsDragging(false);
      return;
    }
    setData((data: T[]) => {
      const originalPos = findPositionOfItems(active.id);
      const newPos = findPositionOfItems(over.id);
      const newArray = arrayMove(data, originalPos, newPos);
      setIsDragging(false);
      return newArray;
    });
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  // Only call onChange when data changes from user drag, not from items prop sync
  useEffect(() => {
    if (isDragging === false && onChange && JSON.stringify(data) !== JSON.stringify(items)) {
      onChange(data);
    }
  }, [data, isDragging]);

  // Sync internal state with items prop
  useEffect(() => {
    console.log("items", items);
    setData(items);
  }, [items]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={data.map((item: { id: any }) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        {data.map((item) => (
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
