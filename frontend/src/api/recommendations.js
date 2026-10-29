import apiClient from './client.js'

export const recommendationsApi = {
  /**
   * Fetch job/internship recommendations for a completed analysis.
   *
   * @param {object} params
   * @param {number}  params.analysis_id        - Required. ID of an existing analysis.
   * @param {string}  [params.location]          - Optional location preference.
   * @param {boolean} [params.include_internships=true]
   * @param {boolean} [params.include_fulltime=true]
   * @param {number}  [params.max_results=8]
   */
  get: (params) =>
    apiClient.post('/recommendations/', params).then((r) => r.data),
}
