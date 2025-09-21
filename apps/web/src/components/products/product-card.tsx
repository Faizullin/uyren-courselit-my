import { InternalCourse } from "@workspace/common-logic";
import { Constants } from "@workspace/common-models";
import { getSymbolFromCurrency } from "@workspace/components-library";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { capitalize } from "@workspace/utils";
import { BookOpen, CheckCircle, CircleDashed, Download, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { useSiteInfo } from "../contexts/site-info-context";

interface ProductCardBaseProps {
    className?: ReturnType<typeof cn>;
    children?: React.ReactNode;
}

export function ProductCard({ product, className }: ProductCardBaseProps & { 
    product: InternalCourse, 
 }) {
    const { siteInfo } = useSiteInfo();
    return (
        <ProductCardContent.Card className={cn("py-0", className)}>
            <ProductCardContent.CardImage src={product.featuredImage?.url || "/courselit_backdrop_square.webp"} alt={product.title} />
            <ProductCardContent.CardContent className="p-4">
                <ProductCardContent.CardHeader >
                    {product.title}
                </ProductCardContent.CardHeader>
                <div className="flex items-center justify-between gap-2 mb-4">
                    <Badge variant="outline">
                    {product.type.toLowerCase() === Constants.CourseType.COURSE ? (
                        <BookOpen className="h-4 w-4 mr-1" />
                    ) : (
                        <Download className="h-4 w-4 mr-1" />
                    )}
                    {capitalize(product.type)}
                    </Badge>
                    <div className="flex items-center gap-2">
                    <TooltipProvider>
                        <Tooltip>
                        <TooltipTrigger asChild>
                            {product.privacy?.toLowerCase() ===
                            Constants.ProductAccessType.PUBLIC ? (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                            ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                            )}
                        </TooltipTrigger>
                        <TooltipContent>
                            {product.privacy?.toLowerCase() ===
                            Constants.ProductAccessType.PUBLIC
                            ? "Public"
                            : "Hidden"}
                        </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                        <Tooltip>
                        <TooltipTrigger asChild>
                            {product.published ? (
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                            ) : (
                            <CircleDashed className="h-4 w-4 text-muted-foreground" />
                            )}
                        </TooltipTrigger>
                        <TooltipContent>
                            {product.published ? "Published" : "Draft"}
                        </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    </div>
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center text-muted-foreground">
                        <span>
                            <span className="text-base">
                            {getSymbolFromCurrency(siteInfo.currencyISOCode || "USD")}{" "}
                            </span>
                            {product.sales.toLocaleString()} sales
                        </span>
                    </div>
                {/* <div className="flex items-center text-muted-foreground">
                <Users className="h-4 w-4 mr-2" />
                <span>{product.customers.toLocaleString()} customers</span>
                </div> */}
                </div>
            </ProductCardContent.CardContent>
        </ProductCardContent.Card>
    );
}

export function ProductSkeletonCard({
    className,
}: ProductCardBaseProps) {
    return (
      <ProductCardContent.Card className={cn("py-0", className)}>
        <div className="relative aspect-video">
          <Skeleton className="h-full w-full" />
        </div>
        <ProductCardContent.CardContent className="p-4">
          <Skeleton className="h-6 w-full mb-3" />
          <Skeleton className="h-6 w-full" />
        </ProductCardContent.CardContent>
      </ProductCardContent.Card>
    );
  }
  

export const ProductCardContent = {
    Card: ({
        className,
        children,
    }: ProductCardBaseProps) => {
        return (
            <Card className={cn("overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1", className)}>
                {children}
            </Card>
        );
    },
    CardImage: ({
        className,
        src,        
        alt,
    }: {
        src: string;
        alt: string;
    } & ProductCardBaseProps) => {
        return (
            <div className={cn("relative aspect-video", className)}>
              <Image src={src} alt={alt} loading="lazy" width={300} height={300} className="w-full h-full object-cover" />
            </div>
        );
    },
    CardContent: ({
        className,
        children,
    }: ProductCardBaseProps) => {
        return <CardContent className={cn("p-4", className)}>{children}</CardContent>;
    },
    CardHeader: ({
        children,
    }: ProductCardBaseProps) => {
        return <h3 className="text-xl font-semibold mb-3">{children}</h3>;
    },
}