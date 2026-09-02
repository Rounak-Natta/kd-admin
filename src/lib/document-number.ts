import {
  DocumentType,
  type Prisma,
} from "@prisma/client";
const SEQUENCE_WIDTH = 4;
const MAX_DAILY_SEQUENCE = 999_999;
const DEFAULT_RANGE_TTL_DAYS = 8;

function formatBusinessDateForDocument(
  businessDate: Date,
): string {
  if (Number.isNaN(businessDate.getTime())) {
    throw new Error("A valid business date is required.");
  }

  return businessDate
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "");
}

const DOCUMENT_PREFIXES = {
  [DocumentType.ORDER]: "ORD",
  [DocumentType.KOT]: "KOT",
  [DocumentType.BILL]: "BILL",
  [DocumentType.RECEIPT]: "RCPT",
  [DocumentType.INVENTORY_TRANSACTION]: "INV",
  [DocumentType.WASTAGE]: "WST",
  [DocumentType.REFUND]: "REF",
  [DocumentType.EXPORT]: "EXP",
} satisfies Record<DocumentType, string>;

export interface BuildDocumentNumberInput {
  documentType: DocumentType;
  businessDate: Date;
  sequenceValue: number;
}

export interface NextDocumentNumberInput {
  restaurantId: string;
  documentType: DocumentType;
  businessDate: Date;
}

export interface ReserveDocumentNumberRangeInput extends NextDocumentNumberInput {
  deviceId: string;
  blockSize: number;
  expiresAt?: Date | null;
}

export interface ReservedDocumentNumberInput extends NextDocumentNumberInput {
  deviceId: string;
  documentNumber?: string | null;
}

function validateBusinessDate(businessDate: Date): void {
  if (Number.isNaN(businessDate.getTime())) {
    throw new Error("A valid business date is required.");
  }
}

function validateSequenceValue(sequenceValue: number): void {
  if (!Number.isInteger(sequenceValue) || sequenceValue < 1) {
    throw new Error("Document sequence must be a positive integer.");
  }

  if (sequenceValue > MAX_DAILY_SEQUENCE) {
    throw new Error(`Daily document sequence exceeded ${MAX_DAILY_SEQUENCE}.`);
  }
}

export function buildDocumentNumber(input: BuildDocumentNumberInput): string {
  validateBusinessDate(input.businessDate);
  validateSequenceValue(input.sequenceValue);

  const prefix = DOCUMENT_PREFIXES[input.documentType];
  const datePart = formatBusinessDateForDocument(input.businessDate);
  const sequencePart = input.sequenceValue.toString().padStart(SEQUENCE_WIDTH, "0");

  return `${prefix}-${datePart}-${sequencePart}`;
}

function parseSequenceFromDocumentNumber(
  documentType: DocumentType,
  businessDate: Date,
  documentNumber: string,
): number | null {
  const prefix = DOCUMENT_PREFIXES[documentType];
  const datePart = formatBusinessDateForDocument(businessDate);
  const match = new RegExp(`^${prefix}-${datePart}-(\\d{4,6})$`).exec(documentNumber.trim());
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isInteger(value) && value > 0 ? value : null;
}

/** Allocate the next number inside the caller's serializable business transaction. */
export async function nextDocumentNumber(
  transaction: Prisma.TransactionClient,
  input: NextDocumentNumberInput,
): Promise<string> {
  const restaurantId = input.restaurantId.trim();
  if (!restaurantId) throw new Error("Restaurant ID is required for document numbering.");
  validateBusinessDate(input.businessDate);

  const sequence = await transaction.businessSequence.upsert({
    where: {
      restaurantId_documentType_businessDate: {
        restaurantId,
        documentType: input.documentType,
        businessDate: input.businessDate,
      },
    },
    create: {
      restaurantId,
      documentType: input.documentType,
      businessDate: input.businessDate,
      lastValue: 1,
    },
    update: { lastValue: { increment: 1 } },
    select: { lastValue: true },
  });

  validateSequenceValue(sequence.lastValue);
  return buildDocumentNumber({ ...input, sequenceValue: sequence.lastValue });
}

/**
 * Reserve a durable block for one device. The BusinessSequence is advanced now,
 * so numbers printed while offline can be treated as final when later synced.
 */
export async function reserveDocumentNumberRange(
  transaction: Prisma.TransactionClient,
  input: ReserveDocumentNumberRangeInput,
): Promise<{
  id: string;
  startValue: number;
  endValue: number;
  expiresAt: Date | null;
}> {
  const restaurantId = input.restaurantId.trim();
  const deviceId = input.deviceId.trim();
  if (!restaurantId || !deviceId) throw new Error("Restaurant and device are required.");
  validateBusinessDate(input.businessDate);
  if (!Number.isInteger(input.blockSize) || input.blockSize < 1 || input.blockSize > 250) {
    throw new Error("Document range block size must be between 1 and 250.");
  }

  const sequence = await transaction.businessSequence.upsert({
    where: {
      restaurantId_documentType_businessDate: {
        restaurantId,
        documentType: input.documentType,
        businessDate: input.businessDate,
      },
    },
    create: {
      restaurantId,
      documentType: input.documentType,
      businessDate: input.businessDate,
      lastValue: input.blockSize,
    },
    update: { lastValue: { increment: input.blockSize } },
    select: { lastValue: true },
  });

  const endValue = sequence.lastValue;
  const startValue = endValue - input.blockSize + 1;
  validateSequenceValue(startValue);
  validateSequenceValue(endValue);

  const expiresAt = input.expiresAt === undefined
    ? new Date(Date.now() + DEFAULT_RANGE_TTL_DAYS * 86_400_000)
    : input.expiresAt;

  return transaction.documentNumberReservation.create({
    data: {
      restaurantId,
      deviceId,
      documentType: input.documentType,
      businessDate: input.businessDate,
      startValue,
      endValue,
      expiresAt,
    },
    select: { id: true, startValue: true, endValue: true, expiresAt: true },
  });
}

/**
 * Use an offline-reserved number when it belongs to this device/range;
 * otherwise allocate normally. This prevents a client from inventing numbers.
 */
export async function reservedOrNextDocumentNumber(
  transaction: Prisma.TransactionClient,
  input: ReservedDocumentNumberInput,
): Promise<string> {
  const candidate = input.documentNumber?.trim();
  if (!candidate) return nextDocumentNumber(transaction, input);

  const sequenceValue = parseSequenceFromDocumentNumber(
    input.documentType,
    input.businessDate,
    candidate,
  );
  if (!sequenceValue) throw new Error("Invalid reserved document number.");

  const reservation = await transaction.documentNumberReservation.findFirst({
    where: {
      restaurantId: input.restaurantId,
      deviceId: input.deviceId,
      documentType: input.documentType,
      businessDate: input.businessDate,
      startValue: { lte: sequenceValue },
      endValue: { gte: sequenceValue },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true },
  });

  if (!reservation) throw new Error("Reserved document number is not assigned to this device.");
  return candidate;
}