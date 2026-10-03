import { CreateActorBody, UpdateActorBody } from "@workspace/api-zod";
import type { actorsTable } from "@workspace/db";
import type { z } from "zod";

type ActorRecord = typeof actorsTable.$inferSelect;
type CreateActorInput = z.infer<typeof CreateActorBody>;
type UpdateActorInput = z.infer<typeof UpdateActorBody>;

export function toActorInsert(body: CreateActorInput) {
  return {
    name: body.name,
    photoUrl: body.photoUrl,
    biography: body.bio,
    birthDate: body.birthDate ?? null,
    birthPlace: body.birthPlace ?? null,
  };
}

export function toActorUpdate(body: UpdateActorInput) {
  return {
    ...(body.name !== undefined && { name: body.name }),
    ...(body.photoUrl !== undefined && { photoUrl: body.photoUrl }),
    ...(body.bio !== undefined && { biography: body.bio }),
    ...(body.birthDate !== undefined && { birthDate: body.birthDate }),
    ...(body.birthPlace !== undefined && { birthPlace: body.birthPlace }),
  };
}

export function toActorResponse(actor: ActorRecord) {
  return {
    id: actor.id,
    name: actor.name,
    photoUrl: actor.photoUrl ?? undefined,
    bio: actor.biography ?? undefined,
    birthDate: actor.birthDate ?? null,
    birthPlace: actor.birthPlace ?? null,
  };
}