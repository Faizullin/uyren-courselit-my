import { UserAccount, UserRole } from "@/generated/prisma";
import { adminAuth } from "@/server/lib/firebaseAdmin";
import { prisma } from "@/server/lib/prisma";
import { TRPCError } from "@trpc/server";
import { UserRecord } from "firebase-admin/auth";
import { z } from "zod";
import { router } from "../core/trpc";
import { protectedProcedure, publicProcedure } from "../core/procedures";

export const authRouter = router({
  /*
   * Sign Up
   */
  signUp: publicProcedure
    .input(
      z.object({
        email: z.string(),
        password: z.string(),
        username: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let fireUser: UserRecord | undefined = undefined;
      let token = "";
      const defaultError = "Issue creating an account.";

      // Username Verification
      const { error } = await validateUsername(input.username);
      if (error) throw new TRPCError({ code: "BAD_REQUEST", message: error });

      // Create Firebase User
      try {
        fireUser = await adminAuth.createUser({
          email: input.email,
          password: input.password,
          displayName: input.username,
        });

        await adminAuth.setCustomUserClaims(fireUser.uid, {
          role: UserRole.user, // Assign 'user' role
        });

        token = await adminAuth.createCustomToken(fireUser.uid);
      } catch (error) {
        if (fireUser) await adminAuth.deleteUser(fireUser.uid);
        const message = error instanceof Error ? error.message : defaultError;
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }

      // Create DB UserAccount
      try {
        await ctx.prisma.userAccount.create({
          data: {
            uid: fireUser.uid,
            email: input.email,
            username: input.username,
            role: UserRole.user,
          },
        });
      } catch {
        await adminAuth.deleteUser(fireUser.uid);
        throw new TRPCError({ code: "BAD_REQUEST", message: defaultError });
      }

      return {
        token,
        message: "Account created.",
      };
    }),

  /*
   * Get Current User Account
   */
  getCurrentUserAccount: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.userAccount.findUnique({
      where: { id: ctx.session!.user.id },
    });
  }),

  /*
   * Update Profile
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        // email: z.string().optional(),
        username: z
          .string()
          .min(1, {
            message: "Username must be at least 1 character.",
          })
          .max(30, {
            message: "Username can only be 30 characters.",
          }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // let fireUser = await adminAuth.getUser(ctx.session.user.uid);
      // const fireUserDisplayName = fireUser.displayName ?? '';

      let userAccount: UserAccount | undefined = undefined;
      // let token = '';
      const defaultError = "Issue updating profile.";

      // // Username Verification
      // if (input.username !== fireUserDisplayName) {
      //     const { error } = await validateUsername(input.username);
      //     if (error) throw new TRPCError({ code: 'BAD_REQUEST', message: error });
      // }

      try {
        return await ctx.prisma.$transaction(async (trx: any) => {
          // Update prisma user
          userAccount = await trx.userAccount.update({
            where: { id: ctx.session!.user.id },
            data: input,
          });

          // // Update firebase user
          // fireUser = await adminAuth.updateUser(fireUser.uid, {
          //     // email: input.email,
          //     displayName: input.username,
          // });

          // token = await adminAuth.createCustomToken(fireUser.uid);

          return {
            message: "Profile updated.",
            userAccount,
            // token,
          };
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : defaultError;
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }
    }),
});

/**
 * Validate Username
 */
async function validateUsername(username: string) {
  let error = "";

  try {
    if (!isUsernameFormatValid(username)) {
      error =
        "Username must only contain letters, numbers, underscores and periods.";
    }

    if (!username) {
      error = "Username can not be empty";
    }

    if (username.length > 30) {
      error = "Username can not be longer than 30 characters";
    }

    const existingUsername = await prisma.userAccount.findUnique({
      where: { username },
    });
    if (existingUsername) {
      error = "Username is already taken";
    }
  } catch {
    error = "An issue occurred.";
  }

  return {
    error,
  };
}

/*
 * Matches string that contains only alphanumeric characters, underscores and periods
 */
function isUsernameFormatValid(username: string) {
  return new RegExp("^[a-zA-Z0-9._]+$").test(username);
}
