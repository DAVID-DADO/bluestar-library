export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({ token: process.env.GH_TOKEN || '' });
}
