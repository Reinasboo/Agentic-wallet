/**
 * Transaction Builder
 * 
 * Creates Solana transactions for various operations.
 * Does NOT sign transactions - that's the wallet layer's job.
 */

import {
  Transaction,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { Result, success, failure } from '../utils/types.js';
import { getSolanaClient } from './solana-client.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('TX_BUILDER');

/**
 * Memo Program v2 — a deployed Solana program that stores arbitrary UTF-8
 * data on-chain.  Using it demonstrates real dApp / protocol interaction
 * because the transaction includes an instruction targeting a non-system
 * program (MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr).
 */
export const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

/**
 * Build a standalone memo transaction (interacts with the Memo Program).
 */
export function buildMemoInstruction(
  message: string,
  signerPubkey: PublicKey,
): TransactionInstruction {
  return new TransactionInstruction({
    keys: [{ pubkey: signerPubkey, isSigner: true, isWritable: false }],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(message, 'utf-8'),
  });
}

/**
 * Build a standalone memo transaction that can be signed and sent.
 */
export async function buildMemoTransaction(
  signer: PublicKey,
  message: string,
): Promise<Result<Transaction, Error>> {
  try {
    const client = getSolanaClient();
    const blockhashResult = await client.getRecentBlockhash();
    if (!blockhashResult.ok) return failure(blockhashResult.error);

    const transaction = new Transaction({
      recentBlockhash: blockhashResult.value,
      feePayer: signer,
    });

    transaction.add(buildMemoInstruction(message, signer));

    logger.debug('Built memo transaction', {
      signer: signer.toBase58(),
      messageLength: message.length,
    });

    return success(transaction);
  } catch (error) {
    logger.error('Failed to build memo transaction', { error: String(error) });
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Build a SOL transfer transaction
 */
export async function buildSolTransfer(
  from: PublicKey,
  to: PublicKey,
  amount: number,
  memo?: string,
): Promise<Result<Transaction, Error>> {
  try {
    const client = getSolanaClient();
    const blockhashResult = await client.getRecentBlockhash();
    
    if (!blockhashResult.ok) {
      return failure(blockhashResult.error);
    }
    
    const lamports = Math.round(amount * LAMPORTS_PER_SOL);
    
    const transaction = new Transaction({
      recentBlockhash: blockhashResult.value,
      feePayer: from,
    });
    
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: from,
        toPubkey: to,
        lamports,
      })
    );

    // Attach an on-chain memo via the Memo Program (dApp interaction)
    if (memo) {
      transaction.add(buildMemoInstruction(memo, from));
    }
    
    logger.debug('Built SOL transfer transaction', {
      from: from.toBase58(),
      to: to.toBase58(),
      amount,
      lamports,
      hasMemo: !!memo,
    });
    
    return success(transaction);
  } catch (error) {
    logger.error('Failed to build SOL transfer', { error: String(error) });
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Build an SPL token transfer transaction
 */
export async function buildTokenTransfer(
  owner: PublicKey,
  mint: PublicKey,
  recipient: PublicKey,
  amount: bigint,
  decimals: number,
  memo?: string,
): Promise<Result<Transaction, Error>> {
  try {
    const client = getSolanaClient();
    const connection = client.getConnection();
    
    const blockhashResult = await client.getRecentBlockhash();
    if (!blockhashResult.ok) {
      return failure(blockhashResult.error);
    }
    
    // Get source token account
    const sourceTokenAccount = await getAssociatedTokenAddress(
      mint,
      owner,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    // Get destination token account
    const destTokenAccount = await getAssociatedTokenAddress(
      mint,
      recipient,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    const transaction = new Transaction({
      recentBlockhash: blockhashResult.value,
      feePayer: owner,
    });
    
    // Check if destination token account exists
    const destAccountInfo = await connection.getAccountInfo(destTokenAccount);
    
    if (!destAccountInfo) {
      // Create associated token account for recipient
      transaction.add(
        createAssociatedTokenAccountInstruction(
          owner, // payer
          destTokenAccount,
          recipient,
          mint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }
    
    // Add transfer instruction
    transaction.add(
      createTransferInstruction(
        sourceTokenAccount,
        destTokenAccount,
        owner,
        amount,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    // Attach an on-chain memo via the Memo Program (dApp interaction)
    if (memo) {
      transaction.add(buildMemoInstruction(memo, owner));
    }
    
    logger.debug('Built token transfer transaction', {
      owner: owner.toBase58(),
      mint: mint.toBase58(),
      recipient: recipient.toBase58(),
      amount: amount.toString(),
    });
    
    return success(transaction);
  } catch (error) {
    logger.error('Failed to build token transfer', { error: String(error) });
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Estimate transaction fee
 */
export async function estimateFee(transaction: Transaction): Promise<Result<number, Error>> {
  try {
    const client = getSolanaClient();
    const connection = client.getConnection();
    
    const message = transaction.compileMessage();
    const fees = await connection.getFeeForMessage(message);
    
    if (fees.value === null) {
      return failure(new Error('Failed to estimate fee'));
    }
    
    return success(fees.value / LAMPORTS_PER_SOL);
  } catch (error) {
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
}
