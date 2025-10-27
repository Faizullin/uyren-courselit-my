export interface ResourceStatus {
  exists: boolean;
  syncedAt?: Date;
  metadata?: {
    totalChunks?: number;
    lastUpdated?: Date;
    vectorCount?: number;
  };
}

export class EduAIClient {
  private static async command<T>(
    action: string,
    method: string,
    resourceId: string,
    resourceType?: string,
    data?: any
  ): Promise<T> {
    const response = await fetch("/api/services/external/edu_ai/commands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        method,
        resource_type: resourceType,
        resource_id: resourceId,
        data,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  }

  // RAG Management
  static async createResource(resourceType: "course" | "lesson", resourceId: string) {
    return this.command("manage_rag", "create", resourceId, resourceType);
  }

  static async readResource(resourceType: "course" | "lesson", resourceId: string) {
    return this.command("manage_rag", "read", resourceId, resourceType);
  }

  static async updateResource(resourceType: "course" | "lesson", resourceId: string, metadata: any) {
    return this.command("manage_rag", "update", resourceId, resourceType, metadata);
  }

  static async deleteResource(resourceType: "course" | "lesson", resourceId: string) {
    return this.command("manage_rag", "delete", resourceId, resourceType);
  }

  // Autograder
  static async startAutograder(resourceId: string, data: any) {
    return this.command("autograder", "start", resourceId, undefined, data);
  }

  static async stopAutograder(resourceId: string) {
    return this.command("autograder", "stop", resourceId);
  }

  static async getAutograderStatus(resourceId: string) {
    return this.command("autograder", "status", resourceId);
  }
}
