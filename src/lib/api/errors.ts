import { ZodError } from "zod";
import { Prisma } from "@/lib/prisma-shim";
import { errorResponse } from "./response";
import { getReadableDbError } from "@/lib/db-errors";

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return errorResponse(error.code, error.message, error.status);
  }

  if (error instanceof ZodError) {
    const message = error.issues.map((issue) => issue.message).join(" ");
    return errorResponse("VALIDATION_ERROR", message || "Girdi doğrulanamadı.", 400);
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientValidationError
  ) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return errorResponse("NOT_FOUND", "İstenen kayıt bulunamadı.", 404);
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2003")
    ) {
      return errorResponse(
        "CONFLICT",
        error.code === "P2002"
          ? "Aynı benzersiz bilgilerle kayıt zaten mevcut."
          : "Kayıt ilişkili veriler nedeniyle değiştirilemiyor.",
        409,
      );
    }
    const message = getReadableDbError(error);
    return errorResponse("DATABASE_ERROR", message, 400);
  }

  console.error("API Error caught:", error);
  return errorResponse("INTERNAL_SERVER_ERROR", "Sistemde beklenmeyen bir hata oluştu.", 500);
}
