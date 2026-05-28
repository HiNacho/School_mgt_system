// AI Comment Generator (Phase 2 - Heuristic AI Commentary Engine)

import { StudentCompiledReport } from './rankingEngine';

const EXCELLENT_TEMPLATES = [
  "An exceptionally brilliant performance! {name} has shown outstanding dedication and mastery, especially in {strengths}. Keep up the fantastic effort.",
  "Outstanding academic work! {name} has maintained a stellar standard this term. {pronoun_cap} exhibits superb command in {strengths} and remains an exemplary student.",
  "A commendable result. {name} has performed brilliantly across all subjects, with stellar achievements in {strengths}. With this level of focus, {pronoun} is destined for higher heights."
];

const VERY_GOOD_TEMPLATES = [
  "A very strong and commendable performance. {name} has demonstrated a high level of academic capability, particularly in {strengths}. A little more effort in {weaknesses} will lead to perfect results.",
  "Impressive results! {name} has shown a solid understanding of this term's curriculum. {pronoun_cap} stands out in {strengths}, though {pronoun} should dedicate more practice to {weaknesses}.",
  "Very good effort this term. {name} is a focused student who has excelled in {strengths}. Sustaining this momentum will guarantee even greater performance next session."
];

const AVERAGE_TEMPLATES = [
  "A satisfactory performance. {name} has shown good potential, especially in {strengths}. However, {pronoun} needs to put in more consistent work in {weaknesses} to improve {possessive} overall average.",
  "Decent effort, but {name} is capable of much more. While {pronoun} did quite well in {strengths}, close attention and remedial practice in {weaknesses} are highly recommended.",
  "An average performance this term. {name} shows steady participation. Increasing {possessive} study hours and focusing on {weaknesses} will help elevate {possessive} grades significantly."
];

const WEAK_TEMPLATES = [
  "A weak performance that requires urgent academic attention. While {name} showed some effort in {strengths}, {pronoun} is struggling significantly in {weaknesses}. Focused home tutoring is advised.",
  "This term's result is below expectations. {name} needs to buckle down and review core concepts, particularly in {weaknesses}. Close collaboration between parents and teachers is essential.",
  "An unsatisfactory result. {name} has the capacity to improve but appears distracted. Greater dedication, active classroom participation, and intensive focus on {weaknesses} are required."
];

export function generateStudentComment(
  report: StudentCompiledReport,
  gender: 'MALE' | 'FEMALE'
): string {
  const name = `${report.firstName}`;
  const pronoun = gender === 'MALE' ? 'he' : 'she';
  const pronoun_cap = gender === 'MALE' ? 'He' : 'She';
  const possessive = gender === 'MALE' ? 'his' : 'her';

  // Sort subjects by total score to find strengths and weaknesses
  const sortedSubjects = [...report.subjects].sort((a, b) => b.total - a.total);

  if (sortedSubjects.length === 0) {
    return `${name} has no scores recorded for this term.`;
  }

  // Determine strengths (top 2 subjects)
  const strengthSubjects = sortedSubjects.slice(0, 2).map(s => s.subjectName);
  let strengthsText = '';
  if (strengthSubjects.length === 1) {
    strengthsText = strengthSubjects[0];
  } else {
    strengthsText = `${strengthSubjects[0]} and ${strengthSubjects[1]}`;
  }

  // Determine weaknesses (bottom 2 subjects, ensuring they are not also top strengths)
  const weaknessCandidates = sortedSubjects.slice(2).reverse().filter(s => s.total < 60);
  let weaknessSubjects = weaknessCandidates.slice(0, 2).map(s => s.subjectName);
  
  if (weaknessSubjects.length === 0) {
    // If no subjects are under 60, just take the absolute lowest performing subject
    weaknessSubjects = [sortedSubjects[sortedSubjects.length - 1].subjectName];
  }

  let weaknessesText = '';
  if (weaknessSubjects.length === 1) {
    weaknessesText = weaknessSubjects[0];
  } else {
    weaknessesText = `${weaknessSubjects[0]} and ${weaknessSubjects[1]}`;
  }

  let selectedTemplate = '';
  const avg = report.averageScore;

  if (avg >= 75) {
    const idx = Math.floor((avg * 7) % EXCELLENT_TEMPLATES.length);
    selectedTemplate = EXCELLENT_TEMPLATES[idx];
  } else if (avg >= 60) {
    const idx = Math.floor((avg * 7) % VERY_GOOD_TEMPLATES.length);
    selectedTemplate = VERY_GOOD_TEMPLATES[idx];
  } else if (avg >= 45) {
    const idx = Math.floor((avg * 7) % AVERAGE_TEMPLATES.length);
    selectedTemplate = AVERAGE_TEMPLATES[idx];
  } else {
    const idx = Math.floor((avg * 7) % WEAK_TEMPLATES.length);
    selectedTemplate = WEAK_TEMPLATES[idx];
  }

  // Replace placeholders
  let comment = selectedTemplate
    .replace(/{name}/g, name)
    .replace(/{pronoun}/g, pronoun)
    .replace(/{pronoun_cap}/g, pronoun_cap)
    .replace(/{possessive}/g, possessive)
    .replace(/{strengths}/g, strengthsText)
    .replace(/{weaknesses}/g, weaknessesText);

  return comment;
}
