import { z } from "zod";
import { AuthorizationException, NotFoundException } from "../../core/exceptions";
import { createDomainRequiredMiddleware, teacherProcedure } from "../../core/procedures";
import { getFormDataSchema, ListInputSchema } from "../../core/schema";
import { router } from "../../core/trpc";
import { documentIdValidator } from "../../core/validators";
import { connectToDatabase } from "@workspace/common-logic";
import AgentModel from "@/models/Agent";

const domainTeacher = teacherProcedure.use(createDomainRequiredMiddleware());

const ScopeEnum = z.enum(["PUBLIC", "USER"]);

const ProviderEnum = z.enum([
  "openai",
  "anthropic",
  "openrouter",
  "groq",
  "azure-openai",
  "google",
]);

const providerSettingsSchemas = {
  openai: z.object({ apiKey: z.string().min(1), baseUrl: z.string().url().optional() }),
  anthropic: z.object({ apiKey: z.string().min(1), baseUrl: z.string().url().optional() }),
  openrouter: z.object({ apiKey: z.string().min(1), baseUrl: z.string().url().optional() }),
  groq: z.object({ apiKey: z.string().min(1), baseUrl: z.string().url().optional() }),
  "azure-openai": z.object({ apiKey: z.string().min(1), baseUrl: z.string().url(), deployment: z.string().min(1) }),
  google: z.object({ apiKey: z.string().min(1), baseUrl: z.string().url().optional() }),
} as const;

const CreateSchema = getFormDataSchema({
  name: z.string().min(1),
  scope: ScopeEnum.default("USER"),
  provider: ProviderEnum,
  model: z.string().min(1),
  baseUrl: z.string().url().optional(),
  apiKey: z.string().min(1).optional(),
  // arbitrary non-secret settings per provider
  settings: z.record(z.any()).optional(),
});

const UpdateSchema = getFormDataSchema({
  name: z.string().min(1).optional(),
  scope: ScopeEnum.optional(),
  provider: ProviderEnum.optional(),
  model: z.string().min(1).optional(),
  baseUrl: z.string().url().optional(),
  rotateApiKey: z.string().min(1).optional(),
  settings: z.record(z.any()).optional(),
}).extend({
  id: documentIdValidator(),
});

async function assertAgentOwnerOrAdmin(ctx: any, creatorId?: string | null, scope?: "PUBLIC" | "USER") {
  const isAdmin = ctx.session!.user.roles?.includes("admin");
  if (isAdmin) return;
  if (scope === "PUBLIC") throw new AuthorizationException("Cannot access PUBLIC agents as USER");
  if (!creatorId || creatorId !== ctx.user!.userId)
    throw new AuthorizationException("You do not have permission to access this agent");
}

export const agentRouter = router({
  list: domainTeacher
    .input(
      ListInputSchema.extend({
        filter: z.object({ scope: ScopeEnum.optional() }).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      await connectToDatabase();

      const q = input?.search?.q;
      const scopeFilter = input?.filter?.scope;
      const domainId = ctx.domainData.domainObj._id;
      const userId = ctx.user!.userId;

      const where: any = {
        domain: domainId,
        ...(scopeFilter ? { scope: scopeFilter } : {}),
        $or: [
          { scope: "PUBLIC" },
          { scope: "USER", creatorId: userId },
        ],
      };

      if (q) {
        where.$and = [
          {
            $or: [
              { name: { $regex: q, $options: "i" } },
              { provider: { $regex: q, $options: "i" } },
              { model: { $regex: q, $options: "i" } },
            ],
          },
        ];
      }

      const skip = input.pagination?.skip ?? 0;
      const take = input.pagination?.take ?? 20;

      const [items, total] = await Promise.all([
        AgentModel.find(where)
          .select({ name: 1, scope: 1, provider: 1, model: 1, baseUrl: 1, settings: 1, creatorId: 1, createdAt: 1 })
          .skip(skip)
          .limit(take)
          .sort({ createdAt: -1 })
          .lean(),
        AgentModel.countDocuments(where),
      ]);

      return { items, total, meta: { skip, take } };
    }),

  getById: domainTeacher.input(documentIdValidator()).query(async ({ ctx, input }) => {
    await connectToDatabase();

    const row = await AgentModel.findOne({ _id: input, domain: ctx.domainData.domainObj._id }).select(
      "+apiKey"
    );
    if (!row) throw new NotFoundException("Agent", String(input));
    await assertAgentOwnerOrAdmin(ctx, row.creatorId, row.scope);

    // Do not return apiKey by default unless admin or owner
    const isAdmin = ctx.session!.user.roles?.includes("admin");
    const isOwner = row.creatorId && row.creatorId === ctx.user!.userId;
    const result = row.toObject();
    if (!isAdmin && !isOwner) {
      delete (result as any).apiKey;
    }
    return result;
  }),

  create: domainTeacher.input(CreateSchema).mutation(async ({ ctx, input }) => {
    await connectToDatabase();

    if (input.data.scope === "PUBLIC" && !ctx.session!.user.roles?.includes("admin"))
      throw new AuthorizationException("Only admins can create PUBLIC agents");

    // Validate provider-specific settings when available
    const provider = input.data.provider;
    const settingsSchema = (providerSettingsSchemas as any)[provider];
    if (settingsSchema) {
      const parsed = settingsSchema.safeParse({ apiKey: input.data.apiKey, baseUrl: input.data.baseUrl, ...(input.data.settings || {}) });
      if (!parsed.success) {
        throw new AuthorizationException("Invalid provider settings: " + parsed.error.errors.map(e => e.message).join(", "));
      }
    }

    const doc = await AgentModel.create({
      domain: ctx.domainData.domainObj._id,
      name: input.data.name,
      scope: input.data.scope,
      provider: input.data.provider,
      model: input.data.model,
      baseUrl: input.data.baseUrl,
      settings: input.data.settings,
      apiKey: input.data.apiKey,
      creatorId: input.data.scope === "USER" ? ctx.user!.userId : undefined,
    });

    return {
      _id: doc._id.toString(),
      name: doc.name,
      scope: doc.scope,
      provider: doc.provider,
      model: doc.model,
      baseUrl: doc.baseUrl,
      settings: doc.settings,
      creatorId: doc.creatorId,
      createdAt: doc.createdAt,
    };
  }),

  update: domainTeacher.input(UpdateSchema).mutation(async ({ ctx, input }) => {
    await connectToDatabase();

    const row = await AgentModel.findOne({ _id: input.id, domain: ctx.domainData.domainObj._id }).select("+apiKey");
    if (!row) throw new NotFoundException("Agent", String(input.id));
    await assertAgentOwnerOrAdmin(ctx, row.creatorId, row.scope);

    // If provider or baseUrl or settings updated, validate
    const nextProvider = input.data.provider ?? row.provider;
    const settingsSchema = (providerSettingsSchemas as any)[nextProvider];
    const effectiveSettings = { ...row.settings, ...(input.data.settings || {}) };
    const effectiveBaseUrl = input.data.baseUrl ?? row.baseUrl;
    const effectiveApiKey = input.data.rotateApiKey ?? row.apiKey;
    if (settingsSchema) {
      const parsed = settingsSchema.safeParse({ apiKey: effectiveApiKey, baseUrl: effectiveBaseUrl, ...effectiveSettings });
      if (!parsed.success) {
        throw new AuthorizationException("Invalid provider settings: " + parsed.error.errors.map(e => e.message).join(", "));
      }
    }

    if (input.data.scope === "PUBLIC" && !ctx.session!.user.roles?.includes("admin")) {
      throw new AuthorizationException("Only admins can set PUBLIC scope");
    }

    row.name = input.data.name ?? row.name;
    row.scope = input.data.scope ?? row.scope;
    row.provider = nextProvider;
    row.model = input.data.model ?? row.model;
    row.baseUrl = effectiveBaseUrl;
    row.settings = effectiveSettings;
    if (input.data.rotateApiKey) {
      row.apiKey = input.data.rotateApiKey;
    }

    await row.save();

    return {
      _id: row._id.toString(),
      name: row.name,
      scope: row.scope,
      provider: row.provider,
      model: row.model,
      baseUrl: row.baseUrl,
      settings: row.settings,
      creatorId: row.creatorId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }),

  delete: domainTeacher.input(documentIdValidator()).mutation(async ({ ctx, input }) => {
    await connectToDatabase();

    const row = await AgentModel.findOne({ _id: input, domain: ctx.domainData.domainObj._id });
    if (!row) throw new NotFoundException("Agent", String(input));
    await assertAgentOwnerOrAdmin(ctx, row.creatorId, row.scope);

    await AgentModel.deleteOne({ _id: input, domain: ctx.domainData.domainObj._id });
    return { success: true };
  }),
});
