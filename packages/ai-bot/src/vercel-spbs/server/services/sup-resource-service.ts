import { createOpenAI } from "@ai-sdk/openai";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { embed } from "ai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { env } from "../env";
import { BaseResourceService } from "./base-resource-service";


export type ResourceAdapter = {
    add: (content: string, metadata: Record<string, any>) => Promise<void>;
    get: (id: string) => Promise<string>;
}


export class SupResourceService extends BaseResourceService {
    name = "course-sup";

    supabaseClient!: SupabaseClient;
    private models!: {
        openai: ReturnType<typeof createOpenAI>;
    }
    private splitter!: RecursiveCharacterTextSplitter;

    async initialize() {
        const credentials = {
            url: env.NEXT_PUBLIC_SUPABASE_URL!,
            key: env.SUPABASE_SERVICE_KEY!,
        }
        this.supabaseClient = createClient(
            credentials.url,
            credentials.key,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                },
            }
        )
        this.models = {
            openai: createOpenAI({
                apiKey: env.OPENAI_API_KEY,
            }),
        }
        this.splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 512,
            chunkOverlap: 100,
        });
    }

    async addResource(props: {
        content: string;
        metadata: Record<string, any>;
        path: string;
        type: string;
        source: string;
        shouldRefresh: boolean;
        targetType?: string;
        targetId?: string;
        parentPageId?: number;
    }) {
        try {

            if (!props.content.trim()) {
                console.log(`[${props.path}] Skipping resource with no content`);
                return;
            }

            const { checksum, meta, sections } = await this.peocessForSearch(props.content, props.metadata);
            
            // Check for existing resource in DB and compare checksums
            const { error: fetchDataError, data: existingData } = await this.supabaseClient
                .schema('rag')
                .from('nods_page')
                .select('id, path, checksum')
                .filter('path', 'eq', props.path)
                .limit(1)
                .maybeSingle()

            if (fetchDataError) {
                throw fetchDataError
            }

            // We use checksum to determine if this resource & its sections need to be regenerated
            if (!props.shouldRefresh && existingData?.checksum === checksum) {
                console.log(`[${props.path}] Resource unchanged, skipping`);
                return;
            }

            if (existingData) {
                if (!props.shouldRefresh) {
                    console.log(`[${props.path}] Resource has changed, removing old sections and embeddings`)
                } else {
                    console.log(`[${props.path}] Refresh flag set, removing old sections and embeddings`)
                }

                const { error: deleteDataSectionError } = await this.supabaseClient
                    .schema('rag')
                    .from('nods_page_section')
                    .delete()
                    .filter('page_id', 'eq', existingData.id)

                if (deleteDataSectionError) {
                    throw deleteDataSectionError
                }
            }

            // Create/update resource record. Intentionally clear checksum until we
            // have successfully generated all sections.
            const { error: upsertPageDataError, data: upsertPageData } = await this.supabaseClient
                .schema('rag')
                .from('nods_page')
                .upsert(
                    {
                        checksum: null,
                        path: props.path,
                        type: props.type,
                        source: props.source,
                        meta,
                        target_type: props.targetType,
                        target_id: props.targetId,
                        parent_page_id: props.parentPageId,
                    },
                    { onConflict: 'path' }
                )
                .select()
                .limit(1)
                .single()

            if (upsertPageDataError) {
                throw upsertPageDataError
            }

            console.log(`[${props.path}] Adding ${sections.length} sections (with embeddings)`)
            for (const { slug, heading, content } of sections) {
                const input = content;

                try {
                    const { embedding } = await embed({
                        model: this.models.openai.embedding("text-embedding-3-small"),
                        value: input,
                    });

                    const { error: insertSectionError, data: insertSectionData } = await this.supabaseClient
                        .schema('rag')
                        .from('nods_page_section')
                        .insert({
                            page_id: upsertPageData.id,
                            slug,
                            heading,
                            content,
                            token_count: 0,
                            embedding: embedding,
                        })
                        .select()
                        .limit(1)
                        .single()

                    if (insertSectionError) {
                        throw insertSectionError
                    }
                } catch (err) {
                    console.error(
                        `Failed to generate embeddings for '${props.path}' section starting with '${input.slice(0, 40)}...'`
                    )
                    throw err
                }
            }

            // Set resource checksum so that we know this resource was stored successfully
            const { error: updatePageDataError } = await this.supabaseClient
                .schema('rag')
                .from('nods_page')
                .update({ checksum })
                .filter('id', 'eq', upsertPageData.id)

            if (updatePageDataError) {
                throw updatePageDataError
            }

            console.log(`[${props.path}] Resource processing completed successfully`);
        } catch (err) {
            console.error(
                `Resource '${props.path}' or one/multiple of its sections failed to store properly. Resource has been marked with null checksum to indicate that it needs to be re-generated.`
            )
            console.error(err)
        }
    }

    async peocessForSearch(content: string, metadata: Record<string, any>): Promise<{
        checksum: string;
        meta: Record<string, any>;
        sections: {
            slug: string;
            heading: string;
            content: string;
        }[];
    }> {
        // @ts-ignore - crypto is a built-in Node.js module
        const { createHash } = await import('crypto');
        const checksum = createHash('sha256').update(content).digest('hex');

        const documents = await this.splitter.splitText(content);
        
        const sections = documents.map((doc, index) => {
            const firstLine = doc.split('\n')[0]?.trim() || '';
            const heading = firstLine.startsWith('#') 
                ? firstLine.replace(/^#+\s*/, '').substring(0, 100)
                : firstLine.substring(0, 100);
            
            return {
                slug: `section-${index + 1}`,
                heading: heading || `Section ${index + 1}`,
                content: doc,
            };
        });

        return {
            checksum,
            meta: metadata,
            sections,
        };
    }

    async getResourcesByTarget(targetType: string, targetId: string) {
        try {
            const { data: pages, error } = await this.supabaseClient
                .schema('rag')
                .from('nods_page')
                .select('*')
                .eq('target_type', targetType)
                .eq('target_id', targetId)
                .order('path', { ascending: true });

            if (error) throw error;
            return pages || [];
        } catch (error) {
            console.error(`Failed to get resources for ${targetType}:${targetId}:`, error);
            return [];
        }
    }

    async deleteResource(resourceId: string) {
        try {
            const { error } = await this.supabaseClient
                .schema('rag')
                .from('nods_page')
                .delete()
                .eq('id', resourceId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error(`Failed to delete resource ${resourceId}:`, error);
            return false;
        }
    }

    async updateResource(resourceId: string, updates: { meta?: any; checksum?: string }) {
        try {
            const { error } = await this.supabaseClient
                .schema('rag')
                .from('nods_page')
                .update(updates)
                .eq('id', resourceId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error(`Failed to update resource ${resourceId}:`, error);
            return false;
        }
    }

    async searchSimilar(
        query: string, 
        limit: number = 5, 
        target?: { targetType: string; targetId: string }
    ) {
        try {
            const { embedding } = await embed({
                model: this.models.openai.embedding("text-embedding-3-small"),
                value: query,
            });
            
            const { data: sections, error } = await this.supabaseClient
                .schema('rag')
                .rpc('match_page_sections', {
                    query_embedding: embedding,
                    match_threshold: 0.3,
                    match_count: limit,
                });

            if (error) throw error;

            let results = sections || [];
            
            if (target) {
                const { data: pages } = await this.supabaseClient
                    .schema('rag')
                    .from('nods_page')
                    .select('id')
                    .eq('target_type', target.targetType)
                    .eq('target_id', target.targetId);

                const pageIds = new Set((pages || []).map(p => p.id));
                results = results.filter((s: any) => pageIds.has(s.page_id));
            }

            return results.map((section: any) => ({
                content: section.content,
                metadata: {
                    id: section.id,
                    pageId: section.page_id,
                    heading: section.heading,
                },
                score: section.similarity,
            }));
        } catch (error) {
            console.error('Search error:', error);
            return [];
        }
    }
}