import { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError } from "./errors";

export async function validateBody<T>(req: NextRequest, schema: z.ZodSchema<T>): Promise<T> {
  try {
    const body = await req.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw error;
    }
    throw new ApiError("BAD_REQUEST", "Geçersiz JSON formatı gönderildi.", 400);
  }
}

export function validateQuery<T>(req: NextRequest, schema: z.ZodSchema<T>): T {
  try {
    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    return schema.parse(searchParams);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw error;
    }
    throw new ApiError("BAD_REQUEST", "Geçersiz sorgu parametreleri gönderildi.", 400);
  }
}
