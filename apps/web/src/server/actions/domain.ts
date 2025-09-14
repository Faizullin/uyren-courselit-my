"use server";

import { authOptions } from "@/lib/auth/options";
import DomainManager, { getDomainData } from "@/server/lib/domain";
import { checkPermission } from "@workspace/utils";
import { getServerSession } from "next-auth";

export async function clearDomainManagerCache() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      throw new Error("User not found when execute clearDomainManagerCache()");
    }
    if (!checkPermission(session.user.permissions, ["setting:manage"])) {
      throw new Error(
        "User not have permission to execute clearDomainManagerCache()",
      );
    }
    const domainData = await getDomainData();
    if (!domainData.domainObj) {
      throw new Error("Domain not found when execute getDomainData()");
    }
    const response = await DomainManager.removeFromCache(domainData.domainObj);

    return {
      success: true,
      message: "Domain cache cleared successfully",
      response,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to clear domain cache",
    };
  }
}
