/**
 * =============================================================================
 * AI Expand Service Tests
 * =============================================================================
 * 
 * Tests de contrato para el servicio de expansión de temas con IA.
 * Incluye mocks para respuestas 200, 429, y 500.
 * 
 * @test
 */

import { expandTopic } from '../aiExpandService';

// Mock de getAuthToken
jest.mock('../../authService', () => ({
  getAuthToken: jest.fn(() => null),
}));

// Mock de fetch global
global.fetch = jest.fn();

// Mock de AbortController
global.AbortController = jest.fn(() => ({
  abort: jest.fn(),
  signal: {
    aborted: false,
  },
}));

// Mock de setTimeout y clearTimeout
jest.useFakeTimers();

// Helper para crear un contexto válido
function createMockContext(overrides = {}) {
  return {
    moduleId: 'module-01',
    lessonId: 'lesson-01',
    sectionId: 'section-01',
    moduleTitle: 'Test Module',
    lessonTitle: 'Test Lesson',
    sectionTitle: 'Test Section',
    breadcrumbs: ['Test Module', 'Test Lesson', 'Test Section'],
    pageUrl: '/teaching/modules/module-01/lessons/lesson-01',
    locale: 'es-CO',
    userLevel: 'beginner',
    visibleText: 'Test visible text content',
    selectionText: null,
    contentLength: 100,
    ...overrides,
  };
}

// Helper para crear una respuesta mock exitosa
function createSuccessResponse(data) {
  return {
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue({
      success: true,
      data,
    }),
  };
}

// Helper para crear una respuesta mock de error
function createErrorResponse(status, errorData) {
  return {
    ok: false,
    status,
    json: jest.fn().mockResolvedValue({
      success: false,
      error: errorData,
    }),
  };
}

describe('aiExpandService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    fetch.mockClear();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe('expandTopic', () => {
    it('debe expandir un tema exitosamente (200)', async () => {
      const mockContext = createMockContext();
      const mockResponse = createSuccessResponse({
        expandedExplanation: 'Esta es una explicación ampliada del tema. '.repeat(50), // ~1000 palabras
        keyPoints: [
          'Punto clave 1',
          'Punto clave 2',
          'Punto clave 3',
        ],
        suggestedReferences: [
          {
            title: 'Referencia 1',
            url: 'https://example.com/ref1',
            description: 'Descripción de referencia 1',
          },
        ],
        internalLinks: [
          {
            title: 'Enlace interno 1',
            url: '/teaching/modules/module-02',
            description: 'Descripción del enlace',
          },
        ],
      });

      fetch.mockResolvedValueOnce(mockResponse);

      const result = await expandTopic({
        userInput: 'Explica este tema',
        context: mockContext,
      });

      expect(result).toEqual({
        explanation: expect.any(String),
        keyPoints: expect.arrayContaining([
          'Punto clave 1',
          'Punto clave 2',
          'Punto clave 3',
        ]),
        furtherReading: expect.arrayContaining([
          expect.stringContaining('Referencia 1'),
        ]),
        internalLinks: expect.arrayContaining([
          expect.objectContaining({
            title: 'Enlace interno 1',
            route: '/teaching/modules/module-02',
          }),
        ]),
      });

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/ai/expand-topic'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('debe manejar errores de rate limit (429)', async () => {
      const mockContext = createMockContext();
      const mockResponse = createErrorResponse(429, {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded',
      });

      fetch.mockResolvedValueOnce(mockResponse);

      await expect(
        expandTopic({
          userInput: 'Explica este tema',
          context: mockContext,
        })
      ).rejects.toThrow('Rate limit exceeded');

      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('debe manejar errores del servidor (500) y reintentar una vez', async () => {
      const mockContext = createMockContext();
      const mockErrorResponse = createErrorResponse(500, {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      });

      // Primera llamada falla con 500
      fetch.mockResolvedValueOnce(mockErrorResponse);
      
      // Segunda llamada (reintento) también falla con 500
      fetch.mockResolvedValueOnce(mockErrorResponse);

      await expect(
        expandTopic({
          userInput: 'Explica este tema',
          context: mockContext,
        })
      ).rejects.toThrow();

      // Debe haber intentado 2 veces (1 intento inicial + 1 reintento)
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('debe manejar errores de red y reintentar una vez', async () => {
      const mockContext = createMockContext();

      // Primera llamada falla con error de red
      fetch.mockRejectedValueOnce(new Error('Failed to fetch'));
      
      // Segunda llamada (reintento) también falla
      fetch.mockRejectedValueOnce(new Error('Failed to fetch'));

      await expect(
        expandTopic({
          userInput: 'Explica este tema',
          context: mockContext,
        })
      ).rejects.toThrow('Network error');

      // Debe haber intentado 2 veces (1 intento inicial + 1 reintento)
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('debe lanzar error si el contexto no tiene lessonId', async () => {
      const mockContext = createMockContext({ lessonId: null });

      await expect(
        expandTopic({
          userInput: 'Explica este tema',
          context: mockContext,
        })
      ).rejects.toThrow('context.lessonId is required');

      expect(fetch).not.toHaveBeenCalled();
    });

    it('debe lanzar error si el contexto no se proporciona', async () => {
      await expect(
        expandTopic({
          userInput: 'Explica este tema',
          context: null,
        })
      ).rejects.toThrow('context is required');

      expect(fetch).not.toHaveBeenCalled();
    });

    it('debe sanitizar y limitar la explicación a 800-1200 palabras', async () => {
      const mockContext = createMockContext();
      
      // Crear una explicación muy larga (más de 1200 palabras)
      const longExplanation = 'Palabra '.repeat(2000); // 2000 palabras
      
      const mockResponse = createSuccessResponse({
        expandedExplanation: longExplanation,
        keyPoints: [],
        suggestedReferences: [],
        internalLinks: [],
      });

      fetch.mockResolvedValueOnce(mockResponse);

      const result = await expandTopic({
        userInput: 'Explica este tema',
        context: mockContext,
      });

      // Verificar que la explicación se haya limitado
      const wordCount = result.explanation.split(/\s+/).filter(w => w.length > 0).length;
      expect(wordCount).toBeLessThanOrEqual(1200);
    });

    it('debe mapear breadcrumbs de strings a objetos', async () => {
      const mockContext = createMockContext({
        breadcrumbs: ['Module', 'Lesson', 'Section'],
      });

      const mockResponse = createSuccessResponse({
        expandedExplanation: 'Test explanation',
        keyPoints: [],
        suggestedReferences: [],
        internalLinks: [],
      });

      fetch.mockResolvedValueOnce(mockResponse);

      await expandTopic({
        userInput: 'Explica este tema',
        context: mockContext,
      });

      // Verificar que el body de la petición tenga breadcrumbs en formato correcto
      const callArgs = fetch.mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);
      
      expect(requestBody.context.breadcrumbs).toEqual([
        expect.objectContaining({
          label: 'Module',
          id: 'Module',
          type: 'module',
        }),
        expect.objectContaining({
          label: 'Lesson',
          id: 'Lesson',
          type: 'lesson',
        }),
        expect.objectContaining({
          label: 'Section',
          id: 'Section',
          type: 'section',
        }),
      ]);
    });

    it('debe incluir token de autenticación si está disponible', async () => {
      const { getAuthToken } = require('../../authService');
      getAuthToken.mockReturnValueOnce('mock-token-123');

      const mockContext = createMockContext();
      const mockResponse = createSuccessResponse({
        expandedExplanation: 'Test explanation',
        keyPoints: [],
        suggestedReferences: [],
        internalLinks: [],
      });

      fetch.mockResolvedValueOnce(mockResponse);

      await expandTopic({
        userInput: 'Explica este tema',
        context: mockContext,
      });

      const callArgs = fetch.mock.calls[0];
      expect(callArgs[1].headers).toHaveProperty('Authorization', 'Bearer mock-token-123');
    });

    it('debe manejar timeout correctamente', async () => {
      const mockContext = createMockContext();
      let abortCalled = false;

      // Mock de AbortController que detecta cuando se llama abort
      const mockAbortController = {
        abort: jest.fn(() => {
          abortCalled = true;
        }),
        signal: {
          aborted: false,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        },
      };

      global.AbortController = jest.fn(() => mockAbortController);

      // Mock de fetch que nunca resuelve (simula timeout)
      fetch.mockImplementationOnce(() => {
        return new Promise((resolve, reject) => {
          // Simular que el abort se activa después del timeout
          setTimeout(() => {
            if (abortCalled) {
              const error = new Error('Aborted');
              error.name = 'AbortError';
              reject(error);
            }
          }, 25000);
        });
      });

      const promise = expandTopic({
        userInput: 'Explica este tema',
        context: mockContext,
      });

      // Avanzar el tiempo para que se active el timeout (25 segundos)
      jest.advanceTimersByTime(25000);

      await expect(promise).rejects.toThrow('Request timeout');
    });

    it('debe mapear suggestedReferences a furtherReading correctamente', async () => {
      const mockContext = createMockContext();
      const mockResponse = createSuccessResponse({
        expandedExplanation: 'Test explanation',
        keyPoints: [],
        suggestedReferences: [
          {
            title: 'Referencia 1',
            url: 'https://example.com/ref1',
          },
          {
            title: 'Referencia 2',
            url: 'https://example.com/ref2',
            description: 'Descripción de referencia 2',
          },
        ],
        internalLinks: [],
      });

      fetch.mockResolvedValueOnce(mockResponse);

      const result = await expandTopic({
        userInput: 'Explica este tema',
        context: mockContext,
      });

      expect(result.furtherReading).toEqual([
        'Referencia 1 (https://example.com/ref1)',
        'Referencia 2 (https://example.com/ref2)',
      ]);
    });

    it('debe extraer citaciones de la explicación y puntos clave', async () => {
      const mockContext = createMockContext();
      const mockResponse = createSuccessResponse({
        expandedExplanation: 'Esta es una explicación con una citación [1] y otra (Smith, 2020).',
        keyPoints: [
          'Punto clave con citación [2]',
          'Otro punto con citación (Jones et al., 2021)',
        ],
        suggestedReferences: [],
        internalLinks: [],
      });

      fetch.mockResolvedValueOnce(mockResponse);

      const result = await expandTopic({
        userInput: 'Explica este tema',
        context: mockContext,
      });

      // Verificar que se hayan extraído citaciones
      expect(result.citations).toBeDefined();
      expect(result.citations.length).toBeGreaterThan(0);
    });
  });
});

