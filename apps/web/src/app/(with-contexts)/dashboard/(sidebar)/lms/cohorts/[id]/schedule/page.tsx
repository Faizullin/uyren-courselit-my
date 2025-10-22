"use client";

import DashboardContent from "@/components/dashboard/dashboard-content";
import HeaderTopbar from "@/components/dashboard/layout/header-topbar";
import { trpc } from "@/utils/trpc";
import { UIConstants } from "@workspace/common-logic/lib/ui/constants";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { checkPermission } from "@workspace/utils";
import { useProfile } from "@/components/contexts/profile-context";
import Calendar from "@/components/calendar/calendar";
import { ScheduleCalendarService, ScheduleCalendarEvent } from "@/components/calendar/services/schedule-calendar-service";
import { ScheduleTypeEnum } from "@workspace/common-logic/models/lms/schedule.types";

export default function CohortSchedulePage() {
  const { t } = useTranslation(["dashboard", "common"]);
  const params = useParams<{ id: string }>();
  const cohortId = params.id;
  const { profile } = useProfile();
  const trpcUtils = trpc.useUtils();

  const [mode, setMode] = useState<'day' | 'week' | 'month'>('week');
  const [date, setDate] = useState(new Date());

  const breadcrumbs = useMemo(() => [
    { label: t("common:dashboard.cohorts.title"), href: "/dashboard/lms/cohorts" },
    { label: "Schedule", href: "#" },
  ], [t]);

  const cohortQuery = trpc.lmsModule.cohortModule.cohort.getById.useQuery(
    { id: cohortId },
    { enabled: !!cohortId }
  );

  const cohort = cohortQuery.data;

  // Check permissions
  const canManageSchedule = useMemo(() => {
    return checkPermission(profile?.permissions || [], [
      UIConstants.permissions.manageAnyCourse,
    ]);
  }, [profile]);

  // Create service instance with tRPC functions
  // const calendarService = useMemo(() => {
  //   return new ScheduleCalendarService({
  //     cohortId: cohortId,
  //     allowEdit: canManageSchedule,
  //     allowDelete: canManageSchedule,
  //     allowCreate: canManageSchedule,
  //     weekStartsOn: 1, // Monday
      
  //     // Inject tRPC functions
  //     fetchEvents: async (filters) => {
  //       const result = await trpcUtils.lmsModule.cohortModule.cohort.getSchedule.fetch({
  //         cohortId: filters.cohortId!,
  //         startDate: filters.startDate.toISOString(),
  //         endDate: filters.endDate.toISOString(),
  //       });

  //       // Transform backend data to CalendarEvent format
  //       return result.map((event) => ({
  //         id: event._id,
  //         title: event.title,
  //         start: new Date(event.startDate),
  //         end: new Date(event.endDate),
  //         color: '', // Will be set by service.getColorByEvent()
  //         type: event.type,
  //         allDay: event.allDay,
  //         instructor: event.instructor ? {
  //           _id: event.instructor._id,
  //           fullName: event.instructor.fullName || 'Unknown Instructor'
  //         } : undefined,
  //         location: event.location ? {
  //           name: event.location.name,
  //           online: event.location.online || false,
  //           meetingUrl: event.location.meetingUrl,
  //         } : undefined,
  //         description: event.description,
  //         status: event.status,
  //       }));
  //     },

  //     createEventFn: async (data) => {
  //       const result = await trpcUtils.client.lmsModule.schedule.create.mutate({
  //         data: {
  //           ...data,
  //           entityType: "cohort",
  //           entityId: cohortId,
  //           cohortId: cohortId,
  //         },
  //       });

  //       return {
  //         id: result._id,
  //         title: result.title,
  //         start: new Date(result.startDate),
  //         end: new Date(result.endDate),
  //         color: '',
  //         type: result.type,
  //       };
  //     },

  //     updateEventFn: async (id, data) => {
  //       const result = await trpcUtils.client.lmsModule.schedule.update.mutate({
  //         id,
  //         data,
  //       });

  //       return {
  //         id: result._id,
  //         title: result.title,
  //         start: new Date(result.startDate),
  //         end: new Date(result.endDate),
  //         color: '',
  //         type: result.type,
  //       };
  //     },

  //     deleteEventFn: async (id) => {
  //       await trpcUtils.client.lmsModule.schedule.delete.mutate({ id });
  //     },

  //     getEventByIdFn: async (id) => {
  //       const result = await trpcUtils.lmsModule.schedule.getById.fetch({ id });
        
  //       return {
  //         id: result._id,
  //         title: result.title,
  //         start: new Date(result.startDate),
  //         end: new Date(result.endDate),
  //         color: '',
  //         type: result.type,
  //         allDay: result.allDay,
  //         instructor: result.instructor ? {
  //           _id: result.instructor._id,
  //           fullName: result.instructor.fullName || 'Unknown Instructor'
  //         } : undefined,
  //         instructorId: result.instructorId?.toString(),
  //         cohortId: result.cohortId?.toString(),
  //         location: result.location ? {
  //           name: result.location.name || '',
  //           online: result.location.online ?? false,
  //           meetingUrl: result.location.meetingUrl,
  //         } : undefined,
  //         recurrence: result.recurrence ? {
  //           type: result.recurrence.type,
  //           interval: result.recurrence.interval,
  //           daysOfWeek: result.recurrence.daysOfWeek,
  //           endDate: result.recurrence.endDate,
  //         } : undefined,
  //         reminders: result.reminders ? {
  //           enabled: result.reminders.enabled,
  //           minutesBefore: result.reminders.minutesBefore,
  //         } : undefined,
  //         description: result.description,
  //         status: result.status,
  //       };
  //     },
  //   });
  // }, [cohortId, canManageSchedule, trpcUtils]);

  if (cohortQuery.isLoading) {
    return (
      <DashboardContent
        breadcrumbs={breadcrumbs}
        permissions={[UIConstants.permissions.manageCourse]}
      >
        <HeaderTopbar
          header={{
            title: "Cohort Schedule",
            subtitle: "Loading...",
          }}
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading schedule...</div>
        </div>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent
      breadcrumbs={breadcrumbs}
      permissions={[UIConstants.permissions.manageCourse]}
    >
      <HeaderTopbar
        header={{
          title: `${cohort?.title || "Cohort"} - Schedule`,
          subtitle: cohort?.course?.title ? `Course: ${cohort?.course?.title}` : "Cohort Schedule",
        }}
      />

      <div className="grid gap-6">
      </div>
    </DashboardContent>
  );
}