import apiClient from './client.js'

export const jobSearchApi = {
  /**
   * Search for jobs/internships on legitimate job boards.
   *
   * @param {object} params
   * @param {string}  params.query           - Search by job title, skill, or company.
   * @param {string}  [params.location]      - Location preference.
   * @param {boolean} [params.remote=false]  - Filter for remote-friendly roles.
   * @param {string[]} [params.job_types]    - Filters: internship, fresher, graduate_trainee, full_time.
   * @param {string[]} [params.resume_keywords] - Resume skills for matching.
   * @param {number}  [params.max_results=10] - Max role suggestions.
   */
  search: (params) =>
    apiClient.post('/job-search/', params).then((r) => r.data),
}
