"use client";

import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { CreateButton } from "@/components/dashboard/layout/create-button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
    Calendar as CalendarIcon,
    Clock,
    Edit,
    Trash2,
    BookOpen,
    Users,
} from "lucide-react";
import { Calendar as ShadcnCalendar } from "@workspace/ui/components/calendar";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@workspace/ui/components/select";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";

export default function Page() {
    const { t } = useTranslation(["dashboard", "common"]);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [filter, setFilter] = useState("all");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);

    const breadcrumbs = [{ label: t("common:dashboard.schedule.title"), href: "#" }];

    const [schedule, setSchedule] = useState([
        {
            id: 1,
            course: "Advanced Python Programming",
            type: "lecture",
            instructor: "Dr. Chen",
            date: "2025-10-15",
            time: "09:00 - 10:30",
            duration: "90 min",
            location: "Virtual Classroom A",
            enrolled: 28,
        },
        {
            id: 2,
            course: "Web Development Bootcamp",
            type: "lab",
            instructor: "Prof. Johnson",
            date: "2025-10-16",
            time: "13:00 - 15:00",
            duration: "120 min",
            location: "Lab 2B",
            enrolled: 21,
        },
        {
            id: 3,
            course: "Cloud Infrastructure",
            type: "workshop",
            instructor: "Dr. Wilson",
            date: "2025-10-17",
            time: "10:00 - 12:00",
            duration: "120 min",
            location: "Room 301",
            enrolled: 16,
        },
    ]);

    const getTypeConfig = (type: string) => {
        const configs = {
            lecture: { text: "Lecture", color: "bg-blue-900/50 text-blue-300" },
            lab: { text: "Lab", color: "bg-purple-900/50 text-purple-300" },
            workshop: { text: "Workshop", color: "bg-orange-900/50 text-orange-300" },
        };
        return configs[type as keyof typeof configs] || configs.lecture;
    };

    const filteredSchedule = schedule.filter((item) => {
        if (filter === "all") return true;
        return item.type === filter;
    });

    const selectedDateSchedule = selectedDate
        ? filteredSchedule.filter(
              (item) => new Date(item.date).toDateString() === selectedDate.toDateString()
          )
        : [];

    // --- CRUD Handlers ---
    const handleDelete = (id: number) => {
        setSchedule((prev) => prev.filter((s) => s.id !== id));
    };

    const handleSave = (data: any) => {
        if (editingItem) {
            // Editing existing
            setSchedule((prev) =>
                prev.map((item) => (item.id === editingItem.id ? { ...data, id: item.id } : item))
            );
        } else {
            // Creating new
            const newId = Math.max(0, ...schedule.map((s) => s.id)) + 1;
            setSchedule((prev) => [...prev, { ...data, id: newId }]);
        }
        setIsDialogOpen(false);
        setEditingItem(null);
    };

    const handleEditClick = (item: any) => {
        setEditingItem(item);
        setIsDialogOpen(true);
    };

    return (
        <DashboardContent
            breadcrumbs={breadcrumbs}
            permissions={[
                UIConstants.permissions.manageAnyCourse,
                UIConstants.permissions.manageCourse,
            ]}
        >
            <HeaderTopbar
                header={{
                    title: t("common:dashboard.schedule.title"),
                    subtitle: "Manage and organize class schedules, labs, and workshops",
                }}
                rightAction={
                    <Button onClick={() => setIsDialogOpen(true)}>
                        {t("common:dashboard.schedule.create")}
                    </Button>
                }
            />

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
                {["all", "lecture", "lab", "workshop"].map((f) => (
                    <Button
                        key={f}
                        variant={filter === f ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter(f)}
                    >
                        {f === "all"
                            ? "All"
                            : f.charAt(0).toUpperCase() + f.slice(1) + "s"}
                    </Button>
                ))}
            </div>

            {/* Calendar Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5" />
                        Course Schedule Calendar
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Calendar */}
                        <div className="flex justify-center items-center">
                            <ShadcnCalendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(day) => setSelectedDate(day)}
                                modifiers={{
                                    booked: filteredSchedule.map((s) => new Date(s.date)),
                                }}
                                modifiersClassNames={{
                                    booked: "bg-blue-500 text-white rounded-full",
                                }}
                                className="rounded-md border text-lg p-6 scale-125 lg:scale-150 transition-transform"
                            />
                        </div>

                        {/* Events List */}
                        <div>
                            <h3 className="font-semibold mb-2">
                                {selectedDate
                                    ? `Sessions on ${format(selectedDate, "PPP")}`
                                    : "Select a date to view sessions"}
                            </h3>

                            <div className="space-y-3">
                                {selectedDateSchedule.map((item) => {
                                    const config = getTypeConfig(item.type);
                                    return (
                                        <div
                                            key={item.id}
                                            className="p-3 border rounded-lg flex justify-between items-start hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge className={config.color}>
                                                        {config.text}
                                                    </Badge>
                                                    <h4 className="font-medium">{item.course}</h4>
                                                </div>
                                                <p className="text-sm text-muted-foreground mb-2">
                                                    {item.time} ({item.duration}) — {item.location}
                                                </p>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Users className="h-3 w-3" />
                                                        {item.enrolled} students
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <BookOpen className="h-3 w-3" />
                                                        {item.instructor}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex items-center gap-1"
                                                    onClick={() => handleEditClick(item)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    className="flex items-center gap-1"
                                                    onClick={() => handleDelete(item.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {selectedDateSchedule.length === 0 && (
                                <div className="text-muted-foreground text-sm py-4 text-center">
                                    No sessions scheduled for this day.
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingItem ? "Edit Session" : "Create New Session"}
                        </DialogTitle>
                    </DialogHeader>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.currentTarget;
                            const data = {
                                course: form.course.value,
                                type: form.type.value,
                                instructor: form.instructor.value,
                                date: form.date.value,
                                time: form.time.value,
                                duration: form.duration.value,
                                location: form.location.value,
                                enrolled: Number(form.enrolled.value),
                            };
                            handleSave(data);
                        }}
                        className="space-y-4"
                    >
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Course</Label>
                                <Input name="course" defaultValue={editingItem?.course || ""} required />
                            </div>
                            <div>
                                <Label>Instructor</Label>
                                <Input name="instructor" defaultValue={editingItem?.instructor || ""} required />
                            </div>
                            <div>
                                <Label>Type</Label>
                                <Select name="type" defaultValue={editingItem?.type || "lecture"}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="lecture">Lecture</SelectItem>
                                        <SelectItem value="lab">Lab</SelectItem>
                                        <SelectItem value="workshop">Workshop</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Date</Label>
                                <Input type="date" name="date" defaultValue={editingItem?.date || ""} required />
                            </div>
                            <div>
                                <Label>Time</Label>
                                <Input name="time" defaultValue={editingItem?.time || ""} required />
                            </div>
                            <div>
                                <Label>Duration</Label>
                                <Input name="duration" defaultValue={editingItem?.duration || ""} />
                            </div>
                            <div>
                                <Label>Location</Label>
                                <Input name="location" defaultValue={editingItem?.location || ""} />
                            </div>
                            <div>
                                <Label>Enrolled Students</Label>
                                <Input
                                    type="number"
                                    name="enrolled"
                                    defaultValue={editingItem?.enrolled || 0}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="submit">{editingItem ? "Save Changes" : "Create"}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </DashboardContent>
    );
}