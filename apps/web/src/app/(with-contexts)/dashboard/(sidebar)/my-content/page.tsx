"use client";

import DashboardContent from "@/components/admin/dashboard-content";
import { ProductCardContent } from "@/components/products/product-card";
import { MY_CONTENT_HEADER } from "@/lib/ui/config/strings";
import { trpc } from "@/utils/trpc";
import { Constants, MembershipEntityType } from "@workspace/common-models";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import { capitalize } from "@workspace/utils";
import { BookOpen, Download, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";


const breadcrumbs = [{ label: MY_CONTENT_HEADER, href: "#" }];

export default function Page() {
  const [data, setData] = useState<ContentItem[]>([]);

  const loadUserContentQuery =
    trpc.userModule.userContent.getProtectedUserContent.useQuery();

  useEffect(() => {
    if (loadUserContentQuery.data) {
      setData(loadUserContentQuery.data as unknown as ContentItem[]);
    }
  }, [loadUserContentQuery.data]);

  const courses = data.filter(
    (item) => item.entityType === Constants.MembershipEntityType.COURSE,
  );
  const communities = data.filter(
    (item) => item.entityType === Constants.MembershipEntityType.COMMUNITY,
  );

  const isLoading = loadUserContentQuery.isLoading;

  return (
    <DashboardContent breadcrumbs={breadcrumbs}>
      <div className="space-y-12">
        <h1 className="text-4xl font-bold">My Content</h1>

        <section>
          <h2 className="text-xl font-semibold mb-6">
            My Products
          </h2>
          {
            (!isLoading && courses.length === 0) ? (
              <EmptyStateMessage type="course" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {
                isLoading ? (
                  <>
                    {[...Array(6)].map((_, index) => (
                      <SkeletonCard key={index} />
                    ))}
                  </>
                ) : (
                  <>
                    {courses.map((item) => (
                      <MyContentCard key={item.entity.id} item={item} />
                    ))}
                  </>
                )
              }
              </div>
            )
          }
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-6">My Communities</h2>
          {
            (!isLoading && communities.length === 0) ? (
              <EmptyStateMessage type="community" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                { isLoading ? (
                  <>
                    {[...Array(6)].map((_, index) => (
                      <SkeletonCard key={index} />
                    ))}
                  </>
                ) : (
                  <>
                    {communities.map((item) => (
                      <MyContentCard key={item.entity.id} item={item} />
                    ))}
                  </>
                )
              }
              </div>
            )
          }
        </section>
      </div>
    </DashboardContent>
  );
}

function SkeletonCard() {
  return (
    <ProductCardContent.Card>
      <Skeleton className="h-48 w-full" />
      <ProductCardContent.CardContent>
        <Skeleton className="h-6 w-3/4 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3" />
      </ProductCardContent.CardContent>
    </ProductCardContent.Card>
  );
}

const EmptyStateMessage = ({ type }: { type: MembershipEntityType }) => (
  <div className="text-center py-12">
    <div className="flex justify-center mb-4">
      {type === Constants.MembershipEntityType.COURSE ? (
        <BookOpen className="w-12 h-12 text-muted-foreground" />
      ) : (
        <Users className="w-12 h-12 text-muted-foreground" />
      )}
    </div>
    <p className="text-muted-foreground mb-4">
      {type === Constants.MembershipEntityType.COURSE
        ? "You haven't enrolled in any products yet."
        : "You haven't joined any communities yet."}{" "}
    </p>
    {type === Constants.MembershipEntityType.COURSE ? (
      <Link href="/courses" className="text-primary">
        <Button size="sm">Browse products</Button>
      </Link>
    ) : (
      <Link href="/communities" className="text-primary">
        <Button size="sm">Browse communities</Button>
      </Link>
    )}
  </div>
);


interface ContentItem {
  entity: {
    id: string;
    title: string;
    slug?: string;
    membersCount?: number;
    totalLessons?: number;
    completedLessonsCount?: number;
    featuredImage: {
      file: string;
      thumbnail: string;
    };
    type:
      | typeof Constants.CourseType.COURSE
      | typeof Constants.CourseType.DOWNLOAD;
  };
  entityType: "community" | "course";
}

interface ContentCardProps {
  item: ContentItem;
}

function MyContentCard({ item }: ContentCardProps) {
  const { entity, entityType } = item;
  const progress =
    entity.totalLessons && entity.completedLessonsCount
      ? (entity.completedLessonsCount / entity.totalLessons) * 100
      : 0;

  const isCourse =
    entityType.toLowerCase() === Constants.MembershipEntityType.COURSE;

  return (
    <ProductCardContent.Card
      key={item.entity.id}
    >
      <ProductCardContent.CardImage
        src={item.entity.featuredImage?.file}
        alt={item.entity.title}
      />
      <ProductCardContent.CardContent>
        <ProductCardContent.CardHeader>{item.entity.title}</ProductCardContent.CardHeader>
        <>
          <Badge variant="secondary">
            {entity.type === Constants.CourseType.COURSE ? (
              <BookOpen className="h-4 w-4 mr-1" />
            ) : (
              <Download className="h-4 w-4 mr-1" />
            )}
            {capitalize(entity.type)}
          </Badge>
        </>
        {isCourse && entity.totalLessons ? (
          <div className="space-y-2 mt-4">
            <ProgressBar value={progress} />
            <p className="text-sm text-muted-foreground flex justify-between">
              <span>{`${entity.completedLessonsCount} of ${entity.totalLessons} lessons completed`}</span>
              <span>{`${Math.round(progress)}%`}</span>
            </p>
          </div>
        ) : (
          <></>
        )}
      </ProductCardContent.CardContent>
    </ProductCardContent.Card>
  );
}

function ProgressBar({ value, className }: {
  value: number;
  className?: ReturnType<typeof cn>;
}) {
  return (
    <div className={cn(`h-2 w-full bg-gray-100 rounded-full`, className)}>
      <div
        className="h-full bg-primary rounded-full transition-all duration-300 ease-in-out"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
