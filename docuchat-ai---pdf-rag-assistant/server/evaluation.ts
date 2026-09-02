import { executeRAGQuery } from './rag';
import { EvaluationResult } from './types';
import { sessionMemory } from './memory';

export interface EvaluationTestCase {
  id: string;
  category: 'known_answer' | 'cross_page' | 'no_evidence_refusal' | 'multi_doc' | 'ambiguous_followup';
  title: string;
  question: string;
  expectedBehavior: string;
  expectedKeywords: string[];
  expectedRefusal: boolean;
  setupSessionMessages?: { role: 'user' | 'assistant'; content: string }[];
}

export const EVALUATION_TEST_CASES: EvaluationTestCase[] = [
  {
    id: 'eval_1_known_answer',
    category: 'known_answer',
    title: 'Direct Factual Retrieval (Known Answer)',
    question: 'How many layers are in the Transformer encoder and what is the output dimension d_model?',
    expectedBehavior: 'Must accurately identify N = 6 layers and d_model = 512 with Page 2 citation.',
    expectedKeywords: ['6', '512', 'encoder'],
    expectedRefusal: false,
  },
  {
    id: 'eval_2_cross_page',
    category: 'cross_page',
    title: 'Cross-Page Evidence Synthesis',
    question: 'Compare how the Transformer encoder and decoder stacks handle self-attention and masking across different layers.',
    expectedBehavior: 'Must synthesize the encoder 2-sublayer structure (Page 2) with masked attention in decoder (Page 2) and Scaled Dot-Product formulation (Page 3).',
    expectedKeywords: ['encoder', 'decoder', 'masking', 'attention'],
    expectedRefusal: false,
  },
  {
    id: 'eval_3_refusal',
    category: 'no_evidence_refusal',
    title: 'Out-of-Distribution Hallucination Refusal',
    question: 'What is the recipe for chocolate chip cookies or the stock price of Tesla?',
    expectedBehavior: 'Must explicitly refuse to answer since cookie recipes and stock prices are not in the uploaded documents.',
    expectedKeywords: ['do not contain', 'not found', 'insufficient'],
    expectedRefusal: true,
  },
  {
    id: 'eval_4_multi_doc',
    category: 'multi_doc',
    title: 'Multi-Document Specification Query',
    question: 'What are the thermal operating limits and heater triggers for the SolarFlow battery system?',
    expectedBehavior: 'Must retrieve SolarFlow manual Page 2: -20C to +55C discharge, 0C to +45C charge, heater at 5C.',
    expectedKeywords: ['-20', '55', 'heater', '5'],
    expectedRefusal: false,
  },
  {
    id: 'eval_5_ambiguous_followup',
    category: 'ambiguous_followup',
    title: 'Conversational Context & Query Rewriting',
    question: 'How many attention heads does it use and what is the dimension of each head?',
    expectedBehavior: 'Must resolve "it" to the Transformer Multi-Head Attention mechanism (8 heads, d_k = 64) using prior conversation context.',
    expectedKeywords: ['8', '64', 'head'],
    expectedRefusal: false,
    setupSessionMessages: [
      { role: 'user', content: 'Tell me about the Transformer Multi-Head Attention mechanism in the Vaswani paper.' },
      { role: 'assistant', content: 'The Transformer uses multi-head attention instead of a single attention function [Doc: Attention_Is_All_You_Need.pdf, Page: 3].' },
    ],
  },
];

export async function runEvaluationSuite(): Promise<{
  summary: {
    totalTests: number;
    passed: number;
    warnings: number;
    failed: number;
    overallAccuracy: number;
    avgLatencyMs: number;
    avgRetrievalTimeMs: number;
    avgGenerationTimeMs: number;
  };
  results: EvaluationResult[];
}> {
  const results: EvaluationResult[] = [];
  let totalLatency = 0;
  let totalRetrieval = 0;
  let totalGen = 0;

  for (const testCase of EVALUATION_TEST_CASES) {
    const testSessionId = `eval_session_${testCase.id}_${Date.now()}`;

    // Setup conversational history if required for follow-up testing
    if (testCase.setupSessionMessages) {
      for (const msg of testCase.setupSessionMessages) {
        sessionMemory.addMessage(testSessionId, msg);
      }
    }

    try {
      const ragResult = await executeRAGQuery(testCase.question, testSessionId, 5);
      const answerLower = ragResult.answer.toLowerCase();

      totalLatency += ragResult.metrics.totalTimeMs;
      totalRetrieval += ragResult.metrics.retrievalTimeMs;
      totalGen += ragResult.metrics.generationTimeMs;

      let status: 'passed' | 'warning' | 'failed' = 'passed';
      let details = '';

      if (testCase.expectedRefusal) {
        const didRefuse =
          /do not contain|not found|cannot find|insufficient|no information/i.test(answerLower);
        if (didRefuse) {
          status = 'passed';
          details = 'Correctly identified missing evidence and refused hallucination.';
        } else {
          status = 'failed';
          details = 'Failed to refuse query for unmentioned topic (possible hallucination).';
        }
      } else {
        const matches = testCase.expectedKeywords.filter((kw) =>
          answerLower.includes(kw.toLowerCase())
        );
        const matchRatio = matches.length / testCase.expectedKeywords.length;

        if (matchRatio >= 0.7 && ragResult.citations.length > 0) {
          status = 'passed';
          details = `Verified ${matches.length}/${testCase.expectedKeywords.length} expected facts with ${ragResult.citations.length} verified citation(s).`;
        } else if (matchRatio >= 0.4 || ragResult.citations.length > 0) {
          status = 'warning';
          details = `Partial factual match (${matches.length}/${testCase.expectedKeywords.length} keywords).`;
        } else {
          status = 'failed';
          details = 'Answer missed required factual details or lacked supporting citations.';
        }
      }

      results.push({
        id: testCase.id,
        category: testCase.category,
        question: testCase.question,
        expectedBehavior: testCase.expectedBehavior,
        actualAnswer: ragResult.answer,
        grounded: ragResult.metrics.grounded,
        retrievalHit: ragResult.metrics.chunksRetrieved > 0,
        score: ragResult.metrics.topScore,
        latencyMs: ragResult.metrics.totalTimeMs,
        citationsCount: ragResult.citations.length,
        status,
        details,
      });
    } catch (err: any) {
      results.push({
        id: testCase.id,
        category: testCase.category,
        question: testCase.question,
        expectedBehavior: testCase.expectedBehavior,
        actualAnswer: `Test run failed: ${err.message}`,
        grounded: false,
        retrievalHit: false,
        score: 0,
        latencyMs: 0,
        citationsCount: 0,
        status: 'failed',
        details: err.message || 'Execution exception',
      });
    }
  }

  const passed = results.filter((r) => r.status === 'passed').length;
  const warnings = results.filter((r) => r.status === 'warning').length;
  const failed = results.filter((r) => r.status === 'failed').length;
  const total = results.length;

  return {
    summary: {
      totalTests: total,
      passed,
      warnings,
      failed,
      overallAccuracy: total > 0 ? Math.round(((passed + warnings * 0.5) / total) * 100) : 0,
      avgLatencyMs: total > 0 ? Math.round(totalLatency / total) : 0,
      avgRetrievalTimeMs: total > 0 ? Math.round(totalRetrieval / total) : 0,
      avgGenerationTimeMs: total > 0 ? Math.round(totalGen / total) : 0,
    },
    results,
  };
}
