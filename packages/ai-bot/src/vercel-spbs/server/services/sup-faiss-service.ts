import { createOpenAI } from "@ai-sdk/openai";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { embed } from "ai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { env } from "../env";
import { BaseResourceService } from "./base-resource-service";
import { FaissStore } from "@langchain/community/vectorstores/faiss";

export class SupFaissService extends BaseResourceService {
    name = "course-sup-faiss";

    supabaseClient!: SupabaseClient;
    private models!: {
        openai: ReturnType<typeof createOpenAI>;
    }
    private splitter!: RecursiveCharacterTextSplitter;
    private faissStore!: FaissStore | null;
    private embeddings!: OpenAIEmbeddings;

    async initialize() {
        const credentials = {
            url: env.NEXT_PUBLIC_SUPABASE_URL!,
            key: env.SUPABASE_SERVICE_KEY!,
        }
        console.log('credentials', credentials);
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
        this.embeddings = new OpenAIEmbeddings({
            openAIApiKey: env.OPENAI_API_KEY,
            modelName: "text-embedding-3-small",
        });
        await this.loadFaissStore();
    }

    private async loadFaissStore() {
        try {            
            const { data: sections, error } = await this.supabaseClient
                .schema('rag')
                .from('nods_page_section')
                .select('id, page_id, heading, content, embedding')
                .not('embedding', 'is', null);

            if (error) {
                console.error('[FAISS] Failed to load sections:', error);
                this.faissStore = null;
                return;
            }

            if (!sections || sections.length === 0) {
                console.log('[FAISS] No existing sections found, creating empty store');
                this.faissStore = await FaissStore.fromTexts(
                    [],
                    [],
                    this.embeddings
                );
                return;
            }

            const documents = sections.map((section: any) => ({
                pageContent: section.content,
                metadata: {
                    id: section.id,
                    pageId: section.page_id,
                    heading: section.heading,
                }
            }));

            const embeddings = sections.map((section: any) => section.embedding);

            this.faissStore = await FaissStore.fromDocuments(
                documents,
                this.embeddings
            );

            console.log(`[FAISS] Loaded ${sections.length} documents into FAISS store`);
        } catch (error) {
            console.error('[FAISS] Failed to initialize FAISS store:', error);
            this.faissStore = null;
        }
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
                console.log(`[${props.path}] Skipping course with no content`);
                return;
            }

            const { checksum, meta, sections } = await this.peocessForSearch(props.content, props.metadata);

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

            if (!props.shouldRefresh && existingData?.checksum === checksum) {
                console.log(`[${props.path}] Resource unchanged, skipping`);
                return;
            }

            if (existingData) {
                console.log(`[${props.path}] Removing old sections`);
                const { error: deleteDataSectionError } = await this.supabaseClient
                    .schema('rag')
                    .from('nods_page_section')
                    .delete()
                    .filter('page_id', 'eq', existingData.id)

                if (deleteDataSectionError) {
                    throw deleteDataSectionError
                }
            }

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

            console.log(`[${props.path}] Adding ${sections.length} sections (with embeddings)`);
            const faissDocuments: any[] = [];

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

                    if (this.faissStore) {
                        faissDocuments.push({
                            pageContent: content,
                            metadata: {
                                id: insertSectionData.id,
                                pageId: upsertPageData.id,
                                heading,
                            }
                        });
                    }
                } catch (err) {
                    console.error(`Failed to generate embeddings for '${props.path}'`)
                    throw err
                }
            }

            if (faissDocuments.length > 0 && this.faissStore) {
                await this.faissStore.addDocuments(faissDocuments);
                console.log(`[${props.path}] Added ${faissDocuments.length} documents to FAISS`);
            }

            const { error: updatePageDataError } = await this.supabaseClient
                .schema('rag')
                .from('nods_page')
                .update({ checksum })
                .filter('id', 'eq', upsertPageData.id)

            if (updatePageDataError) {
                throw updatePageDataError
            }

            console.log(`[${props.path}] Resource processing completed with FAISS`);
        } catch (err) {
            console.error(`Resource '${props.path}' failed to store properly`)
            console.error(err)
        }
    }

    async searchSimilar(query: string, limit: number = 5) {
        if (!this.faissStore) {
            console.warn('[FAISS] FAISS store not available');
            return [];
        }
        
        try {
            const results = await this.faissStore.similaritySearchWithScore(query, limit);
            return results.map(([doc, score]) => ({
                content: doc.pageContent,
                metadata: doc.metadata,
                score,
            }));
        } catch (error) {
            return [];
        }
    }

    async searchSimilarSupabase(
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
                    match_threshold: 0.5,
                    match_count: limit,
                });

            if (error) {
                console.error('[SUPABASE SEARCH] Error:', error);
                return [];
            }

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
                    targetType: section.target_type,
                    targetId: section.target_id,
                },
                score: section.similarity,
            }));
        } catch (error) {
            console.error('[SUPABASE SEARCH] Failed:', error);
            return [];
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

    async saveFaissIndex(path: string) {
        if (!this.faissStore) {
            console.warn('[FAISS] Cannot save index - FAISS not available');
            return;
        }
        
        try {
            await this.faissStore.save(path);
            console.log(`[FAISS] Index saved to ${path}`);
        } catch (error) {
            console.error('[FAISS] Failed to save index:', error);
        }
    }

    async loadFaissIndex(path: string) {
        try {
            const { FaissStore } = await import("@langchain/community/vectorstores/faiss");
            this.faissStore = await FaissStore.load(path, this.embeddings);
            console.log(`[FAISS] Index loaded from ${path}`);
        } catch (error) {
            console.warn('[FAISS] Failed to load index, FAISS not available');
            this.faissStore = null;
        }
    }

    async getResourcesByTarget(targetType: string, targetId: string) {
        try {
            const { data: pages, error: pagesError } = await this.supabaseClient
                .schema('rag')
                .from('nods_page')
                .select('*')
                .eq('target_type', targetType)
                .eq('target_id', targetId)
                .order('path', { ascending: true });

            if (pagesError) throw pagesError;

            const pagesWithCounts = await Promise.all((pages || []).map(async (page) => {
                const { count, error: countError } = await this.supabaseClient
                    .schema('rag')
                    .from('nods_page_section')
                    .select('*', { count: 'exact', head: true })
                    .eq('page_id', page.id);

                return {
                    ...page,
                    sections_count: countError ? 0 : (count || 0),
                };
            }));

            return pagesWithCounts;
        } catch (error) {
            console.error(`Failed to get resources for ${targetType}:${targetId}:`, error);
            return [];
        }
    }

    async deleteResourcesByTarget(targetType: string, targetId: string) {
        try {
            const { error } = await this.supabaseClient
                .schema('rag')
                .from('nods_page')
                .delete()
                .eq('target_type', targetType)
                .eq('target_id', targetId);

            if (error) throw error;

            await this.loadFaissStore();
            console.log(`Deleted resources for ${targetType}:${targetId} and reloaded FAISS`);
            return true;
        } catch (error) {
            console.error(`Failed to delete resources for ${targetType}:${targetId}:`, error);
            return false;
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

            await this.loadFaissStore();
            console.log(`Deleted resource ${resourceId} and reloaded FAISS`);
            return true;
        } catch (error) {
            console.error(`Failed to delete resource ${resourceId}:`, error);
            return false;
        }
    }

    async getResourceWithSections(resourceId: string) {
        try {
            const { data: page, error: pageError } = await this.supabaseClient
                .schema('rag')
                .from('nods_page')
                .select('*')
                .eq('id', resourceId)
                .single();

            if (pageError) throw pageError;

            const { data: sections, error: sectionsError } = await this.supabaseClient
                .schema('rag')
                .from('nods_page_section')
                .select('*')
                .eq('page_id', resourceId)
                .order('id', { ascending: true });

            if (sectionsError) throw sectionsError;

            return {
                page,
                sections: sections || [],
            };
        } catch (error) {
            console.error(`Failed to get resource ${resourceId} with sections:`, error);
            return null;
        }
    }
}
