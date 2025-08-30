export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  console.log('🚀 Revenue Analytics API function called');

  // Simple test response
  return res.status(200).json({
    message: 'Revenue Analytics API is working!',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    body: req.body
  });
}
