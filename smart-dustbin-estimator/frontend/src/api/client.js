import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

export const getDashboard = async () => {
  const res = await api.get('/dashboard');
  return res.data;
};

export const getBins = async () => {
  const res = await api.get('/bins');
  return res.data;
};

export const getBin = async (id) => {
  const res = await api.get(`/bins/${id}`);
  return res.data;
};

export const createBin = async (binData) => {
  const res = await api.post('/bins', binData);
  return res.data;
};

export const updateBin = async (id, binData) => {
  const res = await api.put(`/bins/${id}`, binData);
  return res.data;
};

export const deleteBin = async (id) => {
  const res = await api.delete(`/bins/${id}`);
  return res.data;
};

export const getBinHistory = async (id, range = '24h') => {
  const res = await api.get(`/bins/${id}/history`, { params: { range } });
  return res.data;
};

export const getPriorityCollection = async () => {
  const res = await api.get('/collection');
  return res.data;
};

export const markBinEmptied = async (binId, emptiedBy = 'Collector Operator') => {
  const res = await api.post(`/bins/${binId}/empty`, { emptied_by: emptiedBy });
  return res.data;
};

export const getAlerts = async (openOnly = true) => {
  const res = await api.get('/alerts', { params: { open: openOnly } });
  return res.data;
};

export const acknowledgeAlert = async (alertId) => {
  const res = await api.post(`/alerts/${alertId}/ack`);
  return res.data;
};

export const analyzeImage = async (formData) => {
  const res = await api.post('/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const getSampleImages = async () => {
  const res = await api.get('/samples');
  return res.data;
};

export const analyzeSampleImage = async (filename) => {
  const res = await api.post(`/analyze-sample/${filename}`);
  return res.data;
};

export const getHistory = async (search = '', status = 'all') => {
  const res = await api.get('/history', { params: { search, status } });
  return res.data;
};

export const getHistoryRecord = async (id) => {
  const res = await api.get(`/history/${id}`);
  return res.data;
};

export const deleteHistoryRecord = async (id) => {
  const res = await api.delete(`/history/${id}`);
  return res.data;
};

export const getSimulatorStatus = async () => {
  const res = await api.get('/simulator/status');
  return res.data;
};

export const startSimulator = async () => {
  const res = await api.post('/simulator/start');
  return res.data;
};

export const stopSimulator = async () => {
  const res = await api.post('/simulator/stop');
  return res.data;
};

export default api;

