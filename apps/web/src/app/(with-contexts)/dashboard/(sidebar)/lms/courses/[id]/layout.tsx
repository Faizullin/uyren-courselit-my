import { CourseDetailProvider } from "@/components/course/detail/course-detail-context";    
import { getCachedCourseData } from "@/lib/course/get-course-data";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const courseData = await getCachedCourseData(id);

    return {
      title: courseData.title,
      description: courseData.shortDescription?.slice(0, 160),
      openGraph: {
        title: courseData.title,
        description: courseData.shortDescription?.slice(0, 160),
        images: courseData.featuredImage ? [courseData.featuredImage.url] : [],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: courseData.title,
        description: courseData.shortDescription?.slice(0, 160),
        images: courseData.featuredImage ? [courseData.featuredImage.url] : [],
      },
    };
  } catch (error) {
    return {
      title: 'Course Not Found',
      description: 'The requested course could not be found.',
    };
  }
}

export default async function CourseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const courseData = await getCachedCourseData(id);
  return (
    <CourseDetailProvider initialCourse={courseData as any}>
      {children}
    </CourseDetailProvider>
  );
}