/**
 * AI Provider Factory
 * Creates and manages AI provider instances (OpenAI, Anthropic, Google)
 */

import { OpenAIProvider } from './providers/OpenAIProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { GoogleProvider } from './providers/GoogleProvider';

export interface AIProvider {
  name: string;
  stream(params: StreamParams): AsyncGenerator<StreamChunk, void, unknown>;
}

export interface StreamParams {
  messages: Array<{ role: string; content: string }>;
  system?: string;
  temperature?: number;
  top_p?: number;
  tools?: any[];
}

export interface StreamChunk {
  type: 'token' | 'end' | 'error';
  delta?: string;
  messageId?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  suggestions?: string[];
  error?: string;
  noCache?: boolean;
}

/**
 * AI Provider Factory
 * Creates provider instances based on environment configuration
 */
export class AIProviderFactory {
  private static providers: Map<string, AIProvider> = new Map();
  private static defaultProvider: string;

  /**
   * Initialize providers from environment variables
   */
  static initialize(): void {
    const providerName = process.env.AI_PROVIDER || 'google';
    this.defaultProvider = providerName;

    // Initialize OpenAI if API key is available
    if (process.env.OPENAI_API_KEY) {
      const model = process.env.AI_MODEL_OPENAI || 'gpt-4o-mini';
      this.providers.set('openai', new OpenAIProvider(process.env.OPENAI_API_KEY, model));
      console.log(`✅ OpenAI Provider initialized (model: ${model})`);
    }

    // Initialize Anthropic if API key is available
    if (process.env.ANTHROPIC_API_KEY) {
      const model = process.env.AI_MODEL_ANTHROPIC || 'claude-3-5-haiku-20241022';
      this.providers.set('anthropic', new AnthropicProvider(process.env.ANTHROPIC_API_KEY, model));
      console.log(`✅ Anthropic Provider initialized (model: ${model})`);
    }

    // Initialize Google/Gemini if API key is available
    // Soporta GOOGLE_API_KEY, GEMINI_API_KEY, y NEXT_PUBLIC_GEMINI_API_KEY (para compatibilidad)
    // Nota: NEXT_PUBLIC_ es un prefijo de Next.js, pero lo soportamos como fallback
    const googleApiKey = process.env.GOOGLE_API_KEY
      || process.env.GEMINI_API_KEY
      || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (googleApiKey) {
      // Usar gemini-2.0-flash como modelo por defecto (más estable y ampliamente disponible)
      // Los usuarios pueden especificar otro modelo mediante AI_MODEL_GOOGLE o AI_MODEL_GEMINI
      const model = process.env.AI_MODEL_GOOGLE || process.env.AI_MODEL_GEMINI || 'gemini-2.0-flash';
      this.providers.set('google', new GoogleProvider(googleApiKey, model));
      console.log(`✅ Google/Gemini Provider initialized (model: ${model})`);
    }

    if (this.providers.size === 0) {
      console.warn('⚠️ No AI providers configured. Set at least one API key.');
    } else {
      console.log(`🎯 Default provider: ${this.defaultProvider}`);
    }
  }

  /**
   * Get a provider instance by name
   */
  static getProvider(name: string): AIProvider | null {
    const provider = this.providers.get(name.toLowerCase());
    if (!provider) {
      console.warn(`⚠️ Provider "${name}" not available. Available: ${Array.from(this.providers.keys()).join(', ')}`);
    }
    return provider || null;
  }

  /**
   * Get the default provider
   */
  static getDefaultProvider(): AIProvider | null {
    return this.getProvider(this.defaultProvider);
  }

  /**
   * Get all available provider names
   */
  static getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is available
   */
  static isProviderAvailable(name: string): boolean {
    return this.providers.has(name.toLowerCase());
  }
}

// Auto-initialize on module load
AIProviderFactory.initialize();

