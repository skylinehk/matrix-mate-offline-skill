import fs from 'node:fs';
import path from 'node:path';

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || 'http://127.0.0.1:3000').replace(/\/$/u, '');
}

export function resolveSkillRoot(startCwd = process.cwd()) {
  const directSkill = path.resolve(startCwd);
  if (fs.existsSync(path.join(directSkill, 'SKILL.md')) && fs.existsSync(path.join(directSkill, 'scripts', 'run-offline-mcp.mjs'))) {
    return directSkill;
  }

  const nestedSkill = path.resolve(startCwd, 'skills', 'matrix-mate-offline');
  if (fs.existsSync(path.join(nestedSkill, 'SKILL.md')) && fs.existsSync(path.join(nestedSkill, 'scripts', 'run-offline-mcp.mjs'))) {
    return nestedSkill;
  }

  return directSkill;
}

export function createMatrixMateClient({ baseUrl = process.env.MATRIX_MATE_BASE_URL, fetchImpl = fetch } = {}) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

  async function requestJson(urlPath, init = {}) {
    const response = await fetchImpl(`${normalizedBaseUrl}${urlPath}`, {
      headers: {
        'content-type': 'application/json',
        ...(init.headers || {}),
      },
      ...init,
    });

    const text = await response.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }

    return {
      ok: response.ok,
      status: response.status,
      payload,
      text,
    };
  }

  return {
    baseUrl: normalizedBaseUrl,
    async checkLocalHealth() {
      const response = await fetchImpl(`${normalizedBaseUrl}/`);
      const text = await response.text();
      const titleDetected = /Matrix Mate/u.test(text);
      return {
        ok: response.ok,
        baseUrl: normalizedBaseUrl,
        status: response.status,
        titleDetected,
        message: response.ok
          ? 'Local Matrix Mate app responded successfully.'
          : `Local Matrix Mate app returned status ${response.status}.`,
      };
    },
    async parseMatrixLink(matrixUrl) {
      return requestJson('/v1/intake/matrix-link', {
        method: 'POST',
        body: JSON.stringify({ matrix_url: matrixUrl }),
      });
    },
    async parseManualItinerary({ itaJson, rulesBundle }) {
      return requestJson('/v1/intake/ita', {
        method: 'POST',
        body: JSON.stringify({
          ita_json: itaJson,
          ...(rulesBundle ? { rules_bundle: rulesBundle } : {}),
        }),
      });
    },
    async getTrip(id) {
      return requestJson(`/v1/trips/${encodeURIComponent(id)}`);
    },
    async exportTrip(id) {
      return requestJson(`/v1/trips/${encodeURIComponent(id)}/export`);
    },
    async getFutureBookingIntent(id) {
      return requestJson(`/v1/trips/${encodeURIComponent(id)}/future-booking-intent`);
    },
  };
}
