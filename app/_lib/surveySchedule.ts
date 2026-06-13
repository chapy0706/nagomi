"use client";

function monthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const SESSION_KEY = `nagomi_session_survey_${monthKey()}`;
const NPS_KEY = `nagomi_nps_survey_${monthKey()}`;

export function shouldShowSessionSurvey(): boolean {
  try {
    return !localStorage.getItem(SESSION_KEY);
  } catch {
    return false;
  }
}

export function markSessionSurveyShown(): void {
  try {
    localStorage.setItem(SESSION_KEY, "1");
  } catch {
    // localStorage 不可の環境ではスキップ
  }
}

export function shouldShowNpsSurvey(): boolean {
  try {
    return !localStorage.getItem(NPS_KEY);
  } catch {
    return false;
  }
}

export function markNpsSurveyShown(): void {
  try {
    localStorage.setItem(NPS_KEY, "1");
  } catch {
    // localStorage 不可の環境ではスキップ
  }
}
