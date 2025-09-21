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

    private supabaseClient!: SupabaseClient;
    private models!: {
        openai: ReturnType<typeof createOpenAI>;
    }
    private splitter!: RecursiveCharacterTextSplitter;

    async initialize() {
        const credentials = {
            url: env.NEXT_PUBLIC_RAG_SUPABASE_URL!,
            key: env.RAG_SUPABASE_SERVICE_ROLE_KEY!,
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
    }) {
        try {

            if (!props.content.trim()) {
                console.log(`[${props.path}] Skipping course with no content`);
                return;
            }

            const { checksum, meta, sections } = await this.peocessForSearch(props.content, props.metadata);
            console.log("sections", {
                sections,
                checksum,
                meta,

            });
            // Check for existing course in DB and compare checksums
            const { error: fetchDataError, data: existingData } = await this.supabaseClient
                .from('nods_page')
                .select('id, path, checksum')
                .filter('path', 'eq', props.path)
                .limit(1)
                .maybeSingle()

            if (fetchDataError) {
                throw fetchDataError
            }

            // We use checksum to determine if this course & its sections need to be regenerated
            if (!props.shouldRefresh && existingData?.checksum === checksum) {
                console.log(`[${props.path}] Course unchanged, skipping`);
                return;
            }

            if (existingData) {
                if (!props.shouldRefresh) {
                    console.log(
                        `[${props.path}] Course has changed, removing old course sections and their embeddings`
                    )
                } else {
                    console.log(`[${props.path}] Refresh flag set, removing old course sections and their embeddings`)
                }

                const { error: deleteDataSectionError } = await this.supabaseClient
                    .from('nods_page_section')
                    .delete()
                    .filter('page_id', 'eq', existingData.id)

                if (deleteDataSectionError) {
                    throw deleteDataSectionError
                }
            }

            // Create/update course record. Intentionally clear checksum until we
            // have successfully generated all course sections.
            const { error: upsertPageDataError, data: upsertPageData } = await this.supabaseClient
                .from('nods_page')
                .upsert(
                    {
                        checksum: null,
                        path: props.path,
                        type: props.type,
                        source: props.source,
                        meta,
                    },
                    { onConflict: 'path' }
                )
                .select()
                .limit(1)
                .single()

            if (upsertPageDataError) {
                throw upsertPageDataError
            }

            console.log(`[${props.path}] Adding ${sections.length} course sections (with embeddings)`)
            for (const { slug, heading, content } of sections) {
                // OpenAI recommends replacing newlines with spaces for best results (specific to embeddings)
                const input = content;

                try {
                    const { embedding } = await embed({
                        model: this.models.openai.embedding("text-embedding-3-small"),
                        value: input,
                    });

                    const { error: insertSectionError, data: insertSectionData } = await this.supabaseClient
                        .from('nods_page_section')
                        .insert({
                            page_id: upsertPageData.id,
                            slug,
                            heading,
                            content,
                            token_count: 0, // We don't have token count from our embed function
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
                        `Failed to generate embeddings for '${props.path}' course section starting with '${input.slice(
                            0,
                            40
                        )}...'`
                    )

                    throw err
                }
            }

            // Set course checksum so that we know this course was stored successfully
            const { error: updatePageDataError } = await this.supabaseClient
                .from('nods_page')
                .update({ checksum })
                .filter('id', 'eq', upsertPageData.id)

            if (updatePageDataError) {
                throw updatePageDataError
            }

            console.log(`[${props.path}] Course processing completed successfully`);
        } catch (err) {
            console.error(
                `Course '${props.path}' or one/multiple of its course sections failed to store properly. Course has been marked with null checksum to indicate that it needs to be re-generated.`
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
        return { checksum: '', meta: {}, sections: [] }
    }
}