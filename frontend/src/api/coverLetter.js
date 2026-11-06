import apiClient from './client.js'

export const coverLetterApi = {
  /**
   * Generate a cover letter using Google Gemini AI.
   *
   * @param {object} params
   * @param {number} params.resume_id          - Existing resume ID (preferred).
   * @param {number} params.job_description_id  - Existing job description ID.
   * @param {string} [params.resume_text]      - Raw resume text (fallback).
   * @param {string} [params.job_title]         - Job title (fallback).
   * @param {string} [params.company_name]      - Company name (fallback).
   * @param {string} [params.job_description]   - Job description (fallback).
   * @returns {Promise<{status: string, cover_letter: string}>}
   */
  generate: (params) =>
    apiClient.post('/cover-letter/', params).then((r) => r.data),
}
