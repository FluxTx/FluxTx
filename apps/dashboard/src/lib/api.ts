import { z } from "zod";

const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string()
  })
});

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiJson<TSchema extends z.ZodType>(
  path: string,
  schema: TSchema,
  init?: RequestInit
): Promise<z.output<TSchema>> {
  const response = await fetch(`/api/proxy/v1/${path}`, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      accept: "application/json",
      ...init?.headers
    }
  });
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsedError = apiErrorSchema.safeParse(payload);
    throw new ApiError(
      parsedError.success ? parsedError.data.error.message : "The request could not be completed.",
      response.status,
      parsedError.success ? parsedError.data.error.code : "request_failed"
    );
  }

  return schema.parse(payload);
}
