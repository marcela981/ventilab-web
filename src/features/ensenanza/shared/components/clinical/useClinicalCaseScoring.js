import { useCallback } from 'react';

const useClinicalCaseScoring = (clinicalCase, stepAnswers) => {
  const calculateScore = useCallback(() => {
    if (!clinicalCase) return { score: 0, breakdownByDomain: {} };

    const decisionScores = [];
    const breakdownByDomain = {};

    clinicalCase.steps.forEach((step) => {
      step.decisions?.forEach((decision) => {
        const stepAnswer = stepAnswers[step.id]?.[decision.id] || [];
        const domain = decision.domain || 'general';

        if (!breakdownByDomain[domain]) {
          breakdownByDomain[domain] = {
            totalScore: 0,
            maxScore: 0,
            decisionCount: 0,
          };
        }

        let decisionScore = 0;
        let decisionMax = 0;

        if (decision.type === 'single') {
          const selectedWeight = decision.weights?.[stepAnswer[0]] || 0;
          decisionMax = Math.max(...Object.values(decision.weights || {}));
          
          if (decisionMax > 0) {
            decisionScore = selectedWeight / decisionMax;
          } else {
            decisionScore = 0;
          }
          decisionMax = 1; 
        } else {
          decisionScore = stepAnswer.reduce((sum, optId) => sum + (decision.weights?.[optId] || 0), 0);
          const expertOptions = decision.options.filter(opt => opt.isExpertChoice);
          decisionMax = expertOptions.reduce((sum, opt) => sum + (decision.weights?.[opt.id] || 0), 0);

          if (decisionMax > 0) {
            decisionScore = decisionScore / decisionMax;
          } else {
            decisionScore = 0;
          }
          decisionMax = 1; 
        }

        decisionScores.push({
          score: decisionScore,
          maxScore: decisionMax,
          domain,
        });

        breakdownByDomain[domain].totalScore += decisionScore;
        breakdownByDomain[domain].maxScore += decisionMax; 
        breakdownByDomain[domain].decisionCount += 1;
      });
    });

    const totalScore = decisionScores.reduce((sum, d) => sum + d.score, 0);
    const totalMax = decisionScores.reduce((sum, d) => sum + d.maxScore, 0);
    const averageScore = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;

    Object.keys(breakdownByDomain).forEach((domain) => {
      const domainData = breakdownByDomain[domain];
      const domainAverage = domainData.maxScore > 0
        ? (domainData.totalScore / domainData.maxScore) * 100
        : 0;
      breakdownByDomain[domain].averageScore = Math.round(domainAverage);
      breakdownByDomain[domain].percentage = Math.round(domainAverage);
    });

    return {
      score: Math.round(averageScore),
      breakdownByDomain,
    };
  }, [clinicalCase, stepAnswers]);

  return { calculateScore };
};

export default useClinicalCaseScoring;
