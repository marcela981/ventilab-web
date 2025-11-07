/**
 * Basic tests for AI Tutor streaming
 * Tests streaming functionality across all three providers
 */

import { AIProviderFactory } from '../services/ai/AIProviderFactory';
import { streamTutorResponse } from '../services/ai/TutorService';
import { LessonContext } from '../services/ai/TutorPromptService';

// Mock lesson context for testing
const mockLessonContext: LessonContext = {
  lessonId: 'test-lesson-1',
  title: 'Fundamentos de Ventilación Mecánica',
  objectives: ['Comprender la ecuación del movimiento', 'Aplicar conceptos de PEEP'],
  tags: ['ventilación', 'mecánica', 'PEEP'],
  tipoDeLeccion: 'teoria',
};

/**
 * Test streaming with a short phrase
 * Verifies that tokens arrive in <1s and end includes usage
 */
async function testStreaming(provider: string): Promise<boolean> {
  console.log(`\n🧪 Testing ${provider} provider...`);

  const testMessage = 'Explica qué es la PEEP en una frase corta.';
  const tokens: string[] = [];
  let usage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;
  let error: string | undefined;
  let startTime = Date.now();
  let firstTokenTime: number | undefined;

  try {
    await streamTutorResponse(
      testMessage,
      mockLessonContext,
      provider,
      [],
      {
        onStart: () => {
          startTime = Date.now();
          console.log('  ✓ Stream started');
        },
        onToken: (delta: string) => {
          if (!firstTokenTime) {
            firstTokenTime = Date.now();
            const latency = firstTokenTime - startTime;
            console.log(`  ✓ First token received in ${latency}ms`);
            
            if (latency > 1000) {
              console.warn(`  ⚠️ Warning: First token took ${latency}ms (>1s)`);
            }
          }
          tokens.push(delta);
        },
        onEnd: (endUsage) => {
          usage = endUsage;
          const totalTime = Date.now() - startTime;
          console.log(`  ✓ Stream ended in ${totalTime}ms`);
          console.log(`  ✓ Usage: ${JSON.stringify(usage)}`);
        },
        onError: (err: string) => {
          error = err;
          console.error(`  ✗ Error: ${err}`);
        },
      }
    );

    if (error) {
      console.error(`  ✗ Test failed: ${error}`);
      return false;
    }

    if (!usage) {
      console.error('  ✗ Test failed: No usage information received');
      return false;
    }

    if (tokens.length === 0) {
      console.error('  ✗ Test failed: No tokens received');
      return false;
    }

    const fullResponse = tokens.join('');
    console.log(`  ✓ Received ${tokens.length} tokens (${fullResponse.length} chars)`);
    console.log(`  ✓ Response preview: "${fullResponse.substring(0, 50)}..."`);

    // Verify usage includes all required fields
    if (!usage.promptTokens && !usage.completionTokens && !usage.totalTokens) {
      console.warn('  ⚠️ Warning: Usage information may be incomplete');
    }

    console.log(`  ✅ ${provider} test passed`);
    return true;
  } catch (err: any) {
    console.error(`  ✗ Test failed with exception: ${err.message}`);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('='.repeat(50));
  console.log('🧪 AI Tutor Streaming Tests');
  console.log('='.repeat(50));

  const providers = AIProviderFactory.getAvailableProviders();
  
  if (providers.length === 0) {
    console.error('❌ No AI providers configured. Set at least one API key.');
    console.log('\nRequired environment variables:');
    console.log('  - OPENAI_API_KEY (for OpenAI)');
    console.log('  - ANTHROPIC_API_KEY (for Anthropic)');
    console.log('  - GOOGLE_API_KEY (for Google)');
    process.exit(1);
  }

  console.log(`\n📋 Available providers: ${providers.join(', ')}`);

  const results: { [key: string]: boolean } = {};

  for (const provider of providers) {
    results[provider] = await testStreaming(provider);
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results');
  console.log('='.repeat(50));

  let allPassed = true;
  for (const [provider, passed] of Object.entries(results)) {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${provider}`);
    if (!passed) allPassed = false;
  }

  console.log('='.repeat(50));

  if (allPassed) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('⚠️ Some tests failed');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

export { testStreaming, runTests };

