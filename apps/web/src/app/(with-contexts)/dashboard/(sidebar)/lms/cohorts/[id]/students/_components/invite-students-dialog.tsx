// // InviteStudentsDialog

// import { ICohort } from "@workspace/common-logic/models/lms/cohort.types";
// import { ComboBox2, FormDialog, IUseDialogControl } from "@workspace/components-library";
// import { Field, FieldGroup } from "@workspace/ui/components/field";
// import { useCallback } from "react";
// import { Controller } from "react-hook-form";

// export const InviteStudentsDialog = ({
//     control,
// }: {
//     control: IUseDialogControl<{
//         cohort: ICohort;
//     }>
// }) => {
//     const searchCourses = useCallback(
//         async (search: string, offset: number, size: number): Promise<CourseItem[]> => {
//           const result = await trpcUtils.lmsModule.courseModule.course.list.fetch({
//             pagination: { skip: offset, take: size },
//             search: search ? { q: search } : undefined,
//           });
//           return result.items.map((course) => ({ _id: course._id, title: course.title }));
//         },
//         [trpcUtils],
//       );
    
//       const handleCancel = useCallback(() => {
//         resolve({ reason: "cancel" });
//         hide();
//       }, [resolve, hide]);
    
//       return (
//         <FormDialog
//           open={visible}
//           onOpenChange={(open) => {
//             if (!open) {
//               handleCancel();
//             }
//           }}
//           title="Create New Cohort"
//           onSubmit={form.handleSubmit(handleSubmit)}
//           onCancel={handleCancel}
//           isLoading={createCohortMutation.isPending || form.formState.isSubmitting}
//           submitText="Create Cohort"
//           cancelText="Cancel"
//           maxWidth="xl"
//         >
//           <FieldGroup>
//             <Controller
//               name="courseId"
//               control={form.control}
//               render={({ field, fieldState }) => (
//                 <Field data-invalid={fieldState.invalid}>
//                   <FieldLabel>Course</FieldLabel>
//                   <ComboBox2<CourseItem>
//                     title="Select course"
//                     valueKey="_id"
//                     value={selectedCourse || (field.value ? { _id: field.value, title: "" } : undefined)}
//                     searchFn={searchCourses}
//                     renderLabel={(item) => item.title}
//                     onChange={(item) => {
//                       field.onChange(item?._id || "");
//                       setSelectedCourse(item || undefined);
//                     }}
//                     multiple={false}
//                   />
//                   {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
//                 </Field>
//               )}
//             />
//             <Controller
//               name="description"
//               control={form.control}
//               render={({ field, fieldState }) => (
//                 <Field data-invalid={fieldState.invalid}>
//                   <FieldLabel>Description (Optional)</FieldLabel>
//                   <Textarea
//                     {...field}
//                     placeholder="Enter cohort description"
//                     aria-invalid={fieldState.invalid}
//                     rows={3}
//                   />
//                   {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
//                 </Field>
//               )}
//             />
//             <Controller
//               name="inviteCode"
//               control={form.control}
//               render={({ field, fieldState }) => (
//                 <Field data-invalid={fieldState.invalid}>
//                   <FieldLabel>Invite Code</FieldLabel>
//                   <Input
//                     {...field}
//                     placeholder="Enter unique invite code"
//                     aria-invalid={fieldState.invalid}
//                   />
//                   {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
//                 </Field>
//               )}
//             />
//           </FieldGroup>
//         </FormDialog>
//       );
// }