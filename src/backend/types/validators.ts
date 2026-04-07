/**
 * types/validators.ts
 *
 * Schemas Zod centralizados para validação de payloads da API.
 * Cada schema define a forma exata do corpo esperado na requisição.
 *
 * Uso:
 *   import { CreateUserSchema } from '../types/validators.js';
 *   const parsed = CreateUserSchema.safeParse(req.body);
 *   if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
 */

import { z } from 'zod';

// ── Criação de funcionário/editor ─────────────────────────────────────────────
export const CreateUserSchema = z.object({
  name:     z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  login:    z.string().min(2, 'Login deve ter pelo menos 2 caracteres').max(50)
              .regex(/^[a-zA-Z0-9._-]+$/, 'Login aceita apenas letras, números, ponto, hífen e underscore'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').max(128),
  role:     z.enum(['editor', 'admin', 'vendedor']).optional().default('editor'),
});

export type CreateUserPayload = z.infer<typeof CreateUserSchema>;

// ── Pesquisa de leads ─────────────────────────────────────────────────────────
export const LeadSearchSchema = z.object({
  nicho:     z.string().min(2, 'Nicho é obrigatório').max(200),
  uid:       z.string().min(1, 'UID é obrigatório'),
  savedUrls: z.array(z.string().url()).optional().default([]),
});

export type LeadSearchPayload = z.infer<typeof LeadSearchSchema>;

// ── Geração de roteiro (Script Generator) ────────────────────────────────────
export const GenerateScriptSchema = z.object({
  briefing: z.string().min(10, 'Briefing deve ter pelo menos 10 caracteres').max(5000),
  engine:   z.enum(['groq', 'gemini']).optional().default('groq'),
});

export type GenerateScriptPayload = z.infer<typeof GenerateScriptSchema>;

// ── Log de sistema do frontend ────────────────────────────────────────────────
export const SystemLogSchema = z.object({
  level:     z.enum(['error', 'warn', 'info', 'debug']).optional().default('error'),
  message:   z.string().max(2000).optional().default('(no message)'),
  component: z.string().max(200).optional(),
  stack:     z.string().max(5000).optional(),
  context:   z.unknown().optional(),
  uid:       z.string().max(128).optional(),
  url:       z.string().max(500).optional(),
  userAgent: z.string().max(300).optional(),
});

export type SystemLogPayload = z.infer<typeof SystemLogSchema>;

// ── Envio de mensagem WhatsApp ────────────────────────────────────────────────
export const WhatsappSendSchema = z.object({
  phone:   z.string().min(8, 'Número inválido').max(20).regex(/^\d+$/, 'Apenas dígitos'),
  message: z.string().min(1, 'Mensagem é obrigatória').max(4096),
});

export type WhatsappSendPayload = z.infer<typeof WhatsappSendSchema>;

// ── Pareamento por código ─────────────────────────────────────────────────────
export const WhatsappPairSchema = z.object({
  phone: z.string().min(8).max(20).regex(/^\d+$/, 'Apenas dígitos'),
});

export type WhatsappPairPayload = z.infer<typeof WhatsappPairSchema>;

// ── Scraper Shopify ───────────────────────────────────────────────────────────
export const ShopifyScraperSchema = z.object({
  urls: z.array(z.string().url()).min(1, 'Lista de URLs é obrigatória'),
});

export type ShopifyScraperPayload = z.infer<typeof ShopifyScraperSchema>;

// ── Transcrição de áudio WhatsApp ─────────────────────────────────────────────
export const WhatsappTranscribeSchema = z.object({
  jid:   z.string().min(1, 'JID é obrigatório'),
  msgId: z.string().min(1, 'ID da mensagem é obrigatório'),
});

export type WhatsappTranscribePayload = z.infer<typeof WhatsappTranscribeSchema>;

// ── Recuperação de senha ──────────────────────────────────────────────────────
export const ForgotPasswordSchema = z.object({
  email: z.string().email('E-mail inválido'),
});

export type ForgotPasswordPayload = z.infer<typeof ForgotPasswordSchema>;
