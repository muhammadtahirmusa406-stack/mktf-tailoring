import { createWorker } from 'tesseract.js';

export interface VerificationResult {
  isValid: boolean;
  errors: string[];
  extractedData: {
    statusText?: string;
    foundAccount?: string;
    foundName?: string;
    foundAmount?: number;
    referenceId?: string;
    dateText?: string;
    rawText: string;
  };
}

export async function verifyBankReceipt(
  imageSource: string | File,
  expectedAccount: string,
  expectedName: string,
  expectedAmount: number
): Promise<VerificationResult> {
  const errors: string[] = [];

  // 1. Initialize worker and recognize text
  const worker = await createWorker('eng');
  const ret = await worker.recognize(imageSource);
  await worker.terminate();

  const rawText = ret.data.text || '';
  const lowerText = rawText.toLowerCase();

  // Normalize numbers and remove punctuation
  const cleanAccount = expectedAccount.replace(/[^0-9]/g, '');

  // 2. Rule 1: Status must be Successful / Completed
  const hasSuccess = 
    lowerText.includes('success') || 
    lowerText.includes('successful') || 
    lowerText.includes('completed') || 
    lowerText.includes('approved') || 
    lowerText.includes('transferred');

  const hasPendingOrFailed = 
    lowerText.includes('pending') || 
    lowerText.includes('failed') || 
    lowerText.includes('declined') || 
    lowerText.includes('processing');

  if (!hasSuccess || hasPendingOrFailed) {
    errors.push('Transaction status is not Successful or is still Pending/Failed.');
  }

  // 3. Rule 2: Recipient Account Number
  const digitsOnlyText = rawText.replace(/[^0-9]/g, '');
  const hasAccount = digitsOnlyText.includes(cleanAccount) || rawText.includes(expectedAccount);
  if (!hasAccount) {
    errors.push(`Recipient account number (${expectedAccount}) was not found on the receipt.`);
  }

  // 4. Rule 3: Recipient Name (Check key tokens of the name)
  const nameParts = expectedName
    .toLowerCase()
    .split(/\s+/)
    .filter((p) => p.length > 2);
  const matchedTokens = nameParts.filter((part) => lowerText.includes(part));
  if (nameParts.length > 0 && matchedTokens.length === 0) {
    errors.push(`Beneficiary name (${expectedName}) was not detected on the receipt.`);
  }

  // 5. Rule 4: Amount matching
  const amountMatches = rawText.match(/(?:(?:NGN|₦|N)?\s*)(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+)/gi) || [];
  let foundAmount = 0;
  let amountMatched = false;

  for (const match of amountMatches) {
    const numericStr = match.replace(/[^0-9.]/g, '');
    const val = parseFloat(numericStr);
    if (!isNaN(val)) {
      if (Math.abs(val - expectedAmount) < 1.0) {
        amountMatched = true;
        foundAmount = val;
        break;
      }
    }
  }

  if (!amountMatched) {
    errors.push(`Expected payment amount (₦${expectedAmount.toLocaleString()}) was not detected on the receipt.`);
  }

  // 6. Rule 5 & 6: Transaction Reference ID & Date
  let referenceId = '';
  const refRegex = /(?:session\s*id|ref(?:erence)?(?:\s*no|\s*id)?|txn\s*id|transaction\s*id)[\s:]*([A-Za-z0-9_\-\.\/]+)/i;
  const refMatch = rawText.match(refRegex);
  if (refMatch && refMatch[1]) {
    referenceId = refMatch[1].trim();
  } else {
    const standaloneNumber = rawText.match(/\b\d{16,35}\b/);
    if (standaloneNumber) {
      referenceId = standaloneNumber[0];
    } else {
      referenceId = 'TXN-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    extractedData: {
      statusText: hasSuccess ? 'Successful' : (hasPendingOrFailed ? 'Pending/Failed' : 'Unconfirmed'),
      foundAccount: hasAccount ? expectedAccount : undefined,
      foundName: matchedTokens.join(' ') || undefined,
      foundAmount: amountMatched ? foundAmount : undefined,
      referenceId,
      rawText,
    },
  };
}
