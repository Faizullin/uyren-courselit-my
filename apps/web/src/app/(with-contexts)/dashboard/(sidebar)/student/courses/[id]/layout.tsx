import { CoursePublicDetailProvider } from "@/components/course/detail/course-public-detail-context";
import { getCachedCoursePublicData } from "@/lib/course/get-course-data";
import { trpcCaller } from "@/server/api/caller";
import { NotFoundException } from "@/server/api/core/exceptions";
import { IThemeAsset } from "@workspace/common-logic/models/theme.types";
import { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { StudentCourseSidebar } from "./_components/student-course-sidebar";
import DashboardContent from "@/components/dashboard/dashboard-content";
import { getT } from "@/app/i18n/server";
import { truncate } from "@workspace/utils";


export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { id: courseId } = await params;
 
  try {
    const courseData = await getCachedCoursePublicData(courseId);
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
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id: courseId } = await params;
  const {t} = await getT();

  try {
    const initialCourseData = await getCachedCoursePublicData(courseId);
    const theme = initialCourseData.themeId
      ? await trpcCaller.lmsModule.themeModule.theme.publicGetById({
        id: initialCourseData.themeId,
      })
      : null;
    const assets = theme?.assets || [];

    const breadcrumbs = [
      { label: t("dashboard:my_courses"), href: "/dashboard/student/courses" },
      { label: truncate(initialCourseData.title, 30) || "...", href: "#" }, 
    ];

    return (
      <CoursePublicDetailProvider initialCourse={initialCourseData as any}>  
      <DashboardContent breadcrumbs={breadcrumbs}>
        <ThemeAssets assets={assets} />
          <main className="flex flex-col lg:flex-row gap-4 lg:gap-8 flex-1">
            <div className="flex-1 min-w-0">
              {children}
            </div>
            <div className="lg:w-80 lg:sticky lg:top-4 lg:self-start">
              <StudentCourseSidebar />
            </div>
          </main>
        </DashboardContent>
      </CoursePublicDetailProvider>
    );
  } catch (error) {
    if (error instanceof NotFoundException) {
      return notFound();
    }
    throw error;
  }
}


function ThemeAssets({ assets }: {
  assets: Array<Omit<IThemeAsset, "_id"> & { _id: string }>;
}) {
  if (!assets?.length) return null;

  const nodes = assets.flatMap((a, i) => {
    const key = `${a.assetType}-${i}-${a.url || "inline"}`;
    const out: React.ReactNode[] = [];

    switch (a.assetType) {
      case "stylesheet": {
        if (a.url) {
          if (a.preload) {
            out.push(
              <link
                key={`${key}-preload`}
                rel="preload"
                as="style"
                href={a.url}
                media={a.media}
                crossOrigin={a.crossorigin as any}
                integrity={a.integrity}
              />,
            );
          }
          out.push(
            <link
              key={key}
              rel={a.rel || "stylesheet"}
              href={a.url}
              media={a.media}
              crossOrigin={a.crossorigin as any}
              integrity={a.integrity}
            />,
          );
        } else if (a.content) {
          out.push(
            <style
              key={key}
              media={a.media}
              dangerouslySetInnerHTML={{ __html: a.content }}
            />,
          );
        }
        break;
      }
      case "font": {
        if (a.url) {
          out.push(
            <link
              key={key}
              rel="preload"
              as="font"
              href={a.url}
              type={a.mimeType}
              crossOrigin={a.crossorigin as any}
            />,
          );
        } else if (a.content) {
          out.push(
            <style key={key} dangerouslySetInnerHTML={{ __html: a.content }} />,
          );
        }
        break;
      }
      case "script": {
        if (a.url) {
          out.push(
            <script
              key={key}
              src={a.url}
              async={!!a.async}
              defer={!!a.defer}
              crossOrigin={a.crossorigin as any}
              integrity={a.integrity}
            />,
          );
        } else if (a.content) {
          out.push(
            <script key={key} dangerouslySetInnerHTML={{ __html: a.content }} />,
          );
        }
        break;
      }
      case "image": {
        if (a.url && a.preload) {
          out.push(
            <link
              key={key}
              rel="preload"
              as="image"
              href={a.url}
              media={a.media}
              crossOrigin={a.crossorigin as any}
              imageSizes={a.sizes}
            />,
          );
        }
        break;
      }
    }

    return out;
  });

  return <>{nodes}</>;
}
