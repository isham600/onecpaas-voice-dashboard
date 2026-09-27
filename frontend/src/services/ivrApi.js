import { authApi } from "./api.js";

// Saved IVR flows — codefirstsystem-32-backend /api/v1/voice/ivr.
// Items include `runnable`, `issues` (why the voice engine can't run it yet)
// and `root_prompt` (the first menu's audio file, used as campaign audio).

const BASE = "/api/v1/voice/ivr";

export const listIvrs = (params) => authApi.get(BASE, { params }).then((res) => res.data);

export const createIvr = ({ title, route }) =>
  authApi.post(BASE, { title, route }).then((res) => ({ ivrId: res.data.data.id }));

export const getIvrById = (id) => authApi.get(`${BASE}/${id}`).then((res) => res.data.data);

export const saveIvrSteps = (id, { title, nodes, edges }) =>
  authApi.put(`${BASE}/${id}/steps`, { title, nodes, edges }).then((res) => res.data.data);

export const deleteIvr = (id) => authApi.delete(`${BASE}/${id}`).then((res) => res.data);
